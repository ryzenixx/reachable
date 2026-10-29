import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import {
  maintenance,
  maintenanceComponent,
  maintenanceUpdate,
  maintenanceUpdateComponent,
} from "../db/schema/maintenance";
import { statusPage } from "../db/schema/status-page";
import type {
  CreateMaintenance,
  CreateMaintenanceUpdate,
  MaintenanceHistoryQuery,
} from "./validation";
import { enqueueStatusNotification } from "../notifications/queue";
import { notificationDelivery } from "../db/schema/notification";
import { encodeCursor } from "../history/pagination";
import { recordPageActivity, type Actor } from "../activity/record";
import { lockHistoryComponents, recordComponentStates } from "../components/history-record";

export async function createMaintenance(pageId: string, input: CreateMaintenance, actor: Actor) {
  return db.transaction(async (tx) => {
    const components = input.componentIds.length
      ? await tx
          .select({ id: component.id, name: component.name })
          .from(component)
          .where(and(eq(component.statusPageId, pageId), inArray(component.id, input.componentIds)))
          .orderBy(component.id)
          .for("share")
      : [];
    if (components.length !== input.componentIds.length) return undefined;
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const [created] = await tx
      .insert(maintenance)
      .values({
        statusPageId: pageId,
        title: input.title,
        startsAt,
        endsAt,
        autoStart: input.autoStart,
        autoComplete: input.autoComplete,
        notifyOnAutoTransition: input.notifyOnAutoTransition,
        reminderMinutes: input.reminderMinutes,
      })
      .returning();
    const [update] = await tx
      .insert(maintenanceUpdate)
      .values({
        maintenanceId: created.id,
        status: "scheduled",
        message: input.message,
        startsAt,
        endsAt,
      })
      .returning({ id: maintenanceUpdate.id });
    if (components.length) {
      await tx
        .insert(maintenanceComponent)
        .values(components.map(({ id }) => ({ maintenanceId: created.id, componentId: id })));
      await tx
        .insert(maintenanceUpdateComponent)
        .values(components.map(({ id, name }) => ({ updateId: update.id, componentId: id, name })));
    }
    if (input.notifySubscribers)
      await enqueueStatusNotification(tx, pageId, update.id, {
        kind: "maintenance",
        title: created.title,
        status: "scheduled",
        message: input.message,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        componentIds: input.componentIds,
      });
    await recordPageActivity(tx, pageId, {
      actor,
      action: "maintenance.created",
      resourceType: "maintenance",
      resourceId: created.id,
      details: { notified: input.notifySubscribers ?? false },
    });
    return created;
  });
}

export async function addMaintenanceUpdate(
  pageId: string,
  maintenanceId: string,
  input: CreateMaintenanceUpdate,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(maintenance)
      .where(and(eq(maintenance.id, maintenanceId), eq(maintenance.statusPageId, pageId)))
      .for("update");
    if (!current) return undefined;
    if (current.status === "completed" && input.status !== "completed") return "completed" as const;
    if (current.status === "cancelled" && input.status !== "cancelled") return "cancelled" as const;
    if (
      input.status === "cancelled" &&
      current.status !== "scheduled" &&
      current.status !== "cancelled"
    )
      return "cannot_cancel" as const;
    const startsAt = input.startsAt ? new Date(input.startsAt) : current.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : current.endsAt;
    if (endsAt <= startsAt) return "invalid_window" as const;
    const previousComponents = await tx
      .select({ id: maintenanceComponent.componentId })
      .from(maintenanceComponent)
      .where(eq(maintenanceComponent.maintenanceId, maintenanceId));
    const affectedIds = [
      ...new Set([...previousComponents.map(({ id }) => id), ...(input.componentIds ?? [])]),
    ];
    const locked = await lockHistoryComponents(tx, pageId, affectedIds);
    if (locked.length !== affectedIds.length) return "invalid_components" as const;
    if (input.componentIds) {
      await tx
        .delete(maintenanceComponent)
        .where(eq(maintenanceComponent.maintenanceId, maintenanceId));
      if (input.componentIds.length)
        await tx
          .insert(maintenanceComponent)
          .values(input.componentIds.map((id) => ({ maintenanceId, componentId: id })));
    }
    const [update] = await tx
      .insert(maintenanceUpdate)
      .values({
        maintenanceId,
        status: input.status,
        message: input.message,
        startsAt,
        endsAt,
        createdAt: sql`clock_timestamp()`,
      })
      .returning();
    const components = await tx
      .select({ componentId: component.id, name: component.name })
      .from(maintenanceComponent)
      .innerJoin(component, eq(component.id, maintenanceComponent.componentId))
      .where(eq(maintenanceComponent.maintenanceId, maintenanceId));
    if (components.length)
      await tx
        .insert(maintenanceUpdateComponent)
        .values(components.map((entry) => ({ updateId: update.id, ...entry })));
    await tx
      .update(maintenance)
      .set({
        status: input.status,
        startsAt,
        endsAt,
        updatedAt: update.createdAt,
        autoStart: input.status === "cancelled" ? false : input.autoStart,
        autoComplete: input.status === "cancelled" ? false : input.autoComplete,
        notifyOnAutoTransition: input.status === "cancelled" ? false : input.notifyOnAutoTransition,
        reminderMinutes: input.status === "cancelled" ? null : input.reminderMinutes,
      })
      .where(eq(maintenance.id, maintenanceId));
    await recordComponentStates(
      tx,
      affectedIds,
      { type: "maintenance", id: maintenanceId },
      input.notifySubscribers ?? false,
    );
    if (input.status === "cancelled" && current.status !== "cancelled") {
      await tx
        .update(notificationDelivery)
        .set({ status: "skipped", processedAt: sql`clock_timestamp()` })
        .where(
          and(
            eq(notificationDelivery.status, "pending"),
            inArray(
              notificationDelivery.eventId,
              tx
                .select({ id: maintenanceUpdate.id })
                .from(maintenanceUpdate)
                .where(eq(maintenanceUpdate.maintenanceId, maintenanceId)),
            ),
          ),
        );
    }
    if (input.notifySubscribers)
      await enqueueStatusNotification(tx, pageId, update.id, {
        kind: "maintenance",
        title: current.title,
        status: input.status,
        message: input.message,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        componentIds: [
          ...new Set([
            ...previousComponents.map((entry) => entry.id),
            ...components.map((entry) => entry.componentId),
          ]),
        ],
      });
    await recordPageActivity(tx, pageId, {
      actor,
      action:
        input.status === "cancelled" && current.status !== "cancelled"
          ? "maintenance.cancelled"
          : "maintenance.updated",
      resourceType: "maintenance",
      resourceId: maintenanceId,
      details: {
        updateId: update.id,
        status: input.status,
        notified: input.notifySubscribers ?? false,
      },
    });
    return update;
  });
}

export async function listMaintenances(
  pageId: string,
  options: MaintenanceHistoryQuery,
  publicOnly = false,
) {
  return db.transaction(
    async (tx) => {
      const conditions = [eq(maintenance.statusPageId, pageId)];
      if (publicOnly) conditions.push(eq(statusPage.published, true));
      if (options.state === "scheduled") conditions.push(eq(maintenance.status, "scheduled"));
      if (options.state === "active")
        conditions.push(inArray(maintenance.status, ["in_progress", "verifying"]));
      if (options.state === "past")
        conditions.push(inArray(maintenance.status, ["completed", "cancelled"]));
      if (options.cursor)
        conditions.push(
          sql`(${maintenance.createdAt}, ${maintenance.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)`,
        );
      const rows = await tx
        .select({
          id: maintenance.id,
          title: maintenance.title,
          status: maintenance.status,
          startsAt: maintenance.startsAt,
          endsAt: maintenance.endsAt,
          createdAt: maintenance.createdAt,
          updatedAt: maintenance.updatedAt,
          autoStart: maintenance.autoStart,
          autoComplete: maintenance.autoComplete,
          notifyOnAutoTransition: maintenance.notifyOnAutoTransition,
          reminderMinutes: maintenance.reminderMinutes,
          autoStartMissed: sql<boolean>`${maintenance.status} = 'scheduled' and ${maintenance.autoStart} and ${maintenance.endsAt} <= now()`,
          cursorTimestamp: sql<string>`to_char(${maintenance.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        })
        .from(maintenance)
        .innerJoin(statusPage, eq(statusPage.id, maintenance.statusPageId))
        .where(and(...conditions))
        .orderBy(desc(maintenance.createdAt), desc(maintenance.id))
        .limit(options.limit + 1);
      const items = rows.slice(0, options.limit);
      const last = items.at(-1);
      const nextCursor =
        rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null;
      if (!items.length) return { data: [], nextCursor };
      const ids = items.map((item) => item.id);
      const updates = await tx
        .select()
        .from(maintenanceUpdate)
        .where(inArray(maintenanceUpdate.maintenanceId, ids))
        .orderBy(desc(maintenanceUpdate.createdAt), desc(maintenanceUpdate.id));
      const snapshots = updates.length
        ? await tx
            .select()
            .from(maintenanceUpdateComponent)
            .where(
              inArray(
                maintenanceUpdateComponent.updateId,
                updates.map((update) => update.id),
              ),
            )
            .orderBy(maintenanceUpdateComponent.name, maintenanceUpdateComponent.componentId)
        : [];
      const components = await tx
        .select({
          maintenanceId: maintenanceComponent.maintenanceId,
          id: component.id,
          name: component.name,
        })
        .from(maintenanceComponent)
        .innerJoin(component, eq(component.id, maintenanceComponent.componentId))
        .where(inArray(maintenanceComponent.maintenanceId, ids))
        .orderBy(component.position, component.createdAt, component.id);
      return {
        nextCursor,
        data: items.map(
          ({
            cursorTimestamp: _,
            autoStart,
            autoComplete,
            notifyOnAutoTransition,
            reminderMinutes,
            autoStartMissed,
            ...item
          }) => ({
            ...item,
            ...(!publicOnly && {
              autoStart,
              autoComplete,
              notifyOnAutoTransition,
              reminderMinutes,
              autoStartMissed,
            }),
            updates: updates
              .filter((entry) => entry.maintenanceId === item.id)
              .map(({ maintenanceId: _, ...entry }) => ({
                ...entry,
                components: snapshots
                  .filter((snapshot) => snapshot.updateId === entry.id)
                  .map(({ componentId, name }) => ({ id: componentId, name })),
              })),
            components: components
              .filter((entry) => entry.maintenanceId === item.id)
              .map(({ maintenanceId: _, ...entry }) => entry),
          }),
        ),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function listPublicMaintenances(slug: string, options: MaintenanceHistoryQuery) {
  const [page] = await db
    .select({ id: statusPage.id })
    .from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)))
    .limit(1);
  if (!page) return undefined;
  return listMaintenances(page.id, options, true);
}
