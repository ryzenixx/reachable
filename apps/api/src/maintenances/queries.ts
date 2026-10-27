import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { maintenance, maintenanceComponent, maintenanceUpdate, maintenanceUpdateComponent } from "../db/schema/maintenance";
import { statusPage } from "../db/schema/status-page";
import type { CreateMaintenance, CreateMaintenanceUpdate } from "./validation";

export async function createMaintenance(pageId: string, input: CreateMaintenance) {
  return db.transaction(async (tx) => {
    const components = input.componentIds.length
      ? await tx.select({ id: component.id, name: component.name }).from(component)
        .where(and(eq(component.statusPageId, pageId), inArray(component.id, input.componentIds)))
        .orderBy(component.id).for("share")
      : [];
    if (components.length !== input.componentIds.length) return undefined;
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const [created] = await tx.insert(maintenance).values({
      statusPageId: pageId, title: input.title, startsAt, endsAt,
      autoStart: input.autoStart, autoComplete: input.autoComplete,
    }).returning();
    const [update] = await tx.insert(maintenanceUpdate).values({
      maintenanceId: created.id, status: "scheduled", message: input.message, startsAt, endsAt,
    }).returning({ id: maintenanceUpdate.id });
    if (components.length) {
      await tx.insert(maintenanceComponent).values(components.map(({ id }) => ({ maintenanceId: created.id, componentId: id })));
      await tx.insert(maintenanceUpdateComponent).values(components.map(({ id, name }) => ({ updateId: update.id, componentId: id, name })));
    }
    return created;
  });
}

export async function addMaintenanceUpdate(pageId: string, maintenanceId: string, input: CreateMaintenanceUpdate) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(maintenance)
      .where(and(eq(maintenance.id, maintenanceId), eq(maintenance.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    if (current.status === "completed" && input.status !== "completed") return "completed" as const;
    const startsAt = input.startsAt ? new Date(input.startsAt) : current.startsAt;
    const endsAt = input.endsAt ? new Date(input.endsAt) : current.endsAt;
    if (endsAt <= startsAt) return "invalid_window" as const;
    if (input.componentIds) {
      const components = input.componentIds.length
        ? await tx.select({ id: component.id }).from(component)
          .where(and(eq(component.statusPageId, pageId), inArray(component.id, input.componentIds)))
          .orderBy(component.id).for("share")
        : [];
      if (components.length !== input.componentIds.length) return "invalid_components" as const;
      await tx.delete(maintenanceComponent).where(eq(maintenanceComponent.maintenanceId, maintenanceId));
      if (components.length) await tx.insert(maintenanceComponent)
        .values(components.map(({ id }) => ({ maintenanceId, componentId: id })));
    }
    const [update] = await tx.insert(maintenanceUpdate).values({
      maintenanceId, status: input.status, message: input.message, startsAt, endsAt, createdAt: sql`clock_timestamp()`,
    }).returning();
    const components = await tx.select({ componentId: component.id, name: component.name }).from(maintenanceComponent)
      .innerJoin(component, eq(component.id, maintenanceComponent.componentId))
      .where(eq(maintenanceComponent.maintenanceId, maintenanceId));
    if (components.length) await tx.insert(maintenanceUpdateComponent)
      .values(components.map((entry) => ({ updateId: update.id, ...entry })));
    await tx.update(maintenance).set({
      status: input.status, startsAt, endsAt, updatedAt: update.createdAt,
      autoStart: input.autoStart, autoComplete: input.autoComplete,
    })
      .where(eq(maintenance.id, maintenanceId));
    return update;
  });
}

export async function listMaintenances(pageId: string, publicOnly = false) {
  const conditions = [eq(maintenance.statusPageId, pageId)];
  if (publicOnly) conditions.push(eq(statusPage.published, true));
  const items = await db.select({
    id: maintenance.id, title: maintenance.title, status: maintenance.status, startsAt: maintenance.startsAt,
    endsAt: maintenance.endsAt, createdAt: maintenance.createdAt, updatedAt: maintenance.updatedAt,
    autoStart: maintenance.autoStart, autoComplete: maintenance.autoComplete,
    autoStartMissed: sql<boolean>`${maintenance.status} = 'scheduled' and ${maintenance.autoStart} and ${maintenance.endsAt} <= now()`,
  }).from(maintenance).innerJoin(statusPage, eq(statusPage.id, maintenance.statusPageId))
    .where(and(...conditions)).orderBy(desc(maintenance.startsAt), desc(maintenance.id));
  if (!items.length) return [];
  const ids = items.map((item) => item.id);
  const updates = await db.select().from(maintenanceUpdate).where(inArray(maintenanceUpdate.maintenanceId, ids))
    .orderBy(desc(maintenanceUpdate.createdAt), desc(maintenanceUpdate.id));
  const snapshots = updates.length ? await db.select().from(maintenanceUpdateComponent)
    .where(inArray(maintenanceUpdateComponent.updateId, updates.map((update) => update.id)))
    .orderBy(maintenanceUpdateComponent.name, maintenanceUpdateComponent.componentId) : [];
  const components = await db.select({ maintenanceId: maintenanceComponent.maintenanceId, id: component.id, name: component.name })
    .from(maintenanceComponent).innerJoin(component, eq(component.id, maintenanceComponent.componentId))
    .where(inArray(maintenanceComponent.maintenanceId, ids)).orderBy(component.position, component.createdAt, component.id);
  return items.map(({ autoStart, autoComplete, autoStartMissed, ...item }) => ({
    ...item, ...(!publicOnly && { autoStart, autoComplete, autoStartMissed }),
    updates: updates.filter((entry) => entry.maintenanceId === item.id).map(({ maintenanceId: _, ...entry }) => ({
      ...entry, components: snapshots.filter((snapshot) => snapshot.updateId === entry.id)
        .map(({ componentId, name }) => ({ id: componentId, name })),
    })),
    components: components.filter((entry) => entry.maintenanceId === item.id).map(({ maintenanceId: _, ...entry }) => entry),
  }));
}

export async function listPublicMaintenances(slug: string) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true))).limit(1);
  if (!page) return undefined;
  return listMaintenances(page.id, true);
}
