import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { incident, incidentComponent, incidentUpdate, incidentUpdateComponent } from "../db/schema/incident";
import { statusPage } from "../db/schema/status-page";
import { postmortem } from "../db/schema/postmortem";
import type { CreateHistoricalIncident, CreateIncident, CreateIncidentUpdate, IncidentHistoryQuery } from "./validation";
import { enqueueStatusNotification } from "../notifications/queue";
import { encodeCursor } from "../history/pagination";
import { recordPageActivity, type Actor } from "../activity/record";
import { lockHistoryComponents, recordComponentStates } from "../components/history-record";

export async function createIncident(pageId: string, input: CreateIncident, actor: Actor) {
  return db.transaction(async (tx) => {
    const componentIds = input.components.map((entry) => entry.componentId);
    let components: { id: string; name: string }[] = [];
    if (componentIds.length) {
      components = await lockHistoryComponents(tx, pageId, componentIds);
      if (components.length !== componentIds.length) return undefined;
    }

    const [created] = await tx.insert(incident).values({
      statusPageId: pageId,
      title: input.title,
      status: input.status,
    }).returning();
    const [update] = await tx.insert(incidentUpdate).values({
      incidentId: created.id,
      status: input.status,
      message: input.message,
      componentsRecorded: true,
    }).returning({ id: incidentUpdate.id });
    if (input.components.length) {
      await tx.insert(incidentComponent).values(input.components.map(({ componentId, status }) => ({
        incidentId: created.id,
        componentId,
        impact: status,
      })));
      await tx.insert(incidentUpdateComponent).values(input.components.map(({ componentId, status }) => ({
        updateId: update.id,
        componentId,
        name: components.find((entry) => entry.id === componentId)!.name,
        impact: status,
      })));
    }
    await recordComponentStates(tx, componentIds, { type: "incident", id: created.id });
    if (input.notifySubscribers) await enqueueStatusNotification(tx, pageId, update.id, {
      kind: "incident", title: created.title, status: input.status, message: input.message, componentIds,
    });
    await recordPageActivity(tx, pageId, { actor, action: "incident.created", resourceType: "incident", resourceId: created.id, details: { status: input.status, notified: input.notifySubscribers ?? false } });
    return created;
  });
}

export async function createHistoricalIncident(pageId: string, input: CreateHistoricalIncident, actor: Actor) {
  return db.transaction(async (tx) => {
    const componentIds = input.components.map((entry) => entry.componentId);
    const components = componentIds.length
      ? await tx.select({ id: component.id, name: component.name }).from(component)
        .where(and(eq(component.statusPageId, pageId), inArray(component.id, componentIds)))
        .orderBy(component.id).for("share")
      : [];
    if (components.length !== componentIds.length) return undefined;
    const [created] = await tx.insert(incident).values({
      statusPageId: pageId, title: input.title, status: "resolved", occurredAt: new Date(input.occurredAt),
    }).returning();
    const [update] = await tx.insert(incidentUpdate).values({
      incidentId: created.id, status: "resolved", message: input.message, componentsRecorded: true,
    }).returning({ id: incidentUpdate.id });
    if (input.components.length) {
      await tx.insert(incidentComponent).values(input.components.map(({ componentId, status }) => ({
        incidentId: created.id, componentId, impact: status,
      })));
      await tx.insert(incidentUpdateComponent).values(input.components.map(({ componentId, status }) => ({
        updateId: update.id, componentId, name: components.find((entry) => entry.id === componentId)!.name, impact: status,
      })));
    }
    await recordPageActivity(tx, pageId, { actor, action: "incident.backfilled", resourceType: "incident", resourceId: created.id });
    return created;
  });
}

export async function addIncidentUpdate(pageId: string, incidentId: string, input: CreateIncidentUpdate, actor: Actor) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: incident.id, title: incident.title, occurredAt: incident.occurredAt }).from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId)))
      .for("update");
    if (!existing) return undefined;
    if (existing.occurredAt && input.status !== "resolved") return "historical" as const;

    const linked = await tx.select({ id: incidentComponent.componentId }).from(incidentComponent)
      .where(eq(incidentComponent.incidentId, incidentId));
    const currentIds = new Set(linked.map((entry) => entry.id));
    const removedIds = input.removedComponentIds ?? [];
    if (removedIds.some((id) => !currentIds.has(id))) return "invalid_components" as const;

    const incoming = input.components ?? [];
    const incomingIds = incoming.map((entry) => entry.componentId);
    const affectedIds = [...new Set([...currentIds, ...incomingIds])];
    const valid = await lockHistoryComponents(tx, pageId, affectedIds);
    if (valid.length !== affectedIds.length) return "invalid_components" as const;

    const finalIds = new Set([...currentIds, ...incomingIds]);
    for (const id of removedIds) finalIds.delete(id);
    if (finalIds.size > 100) return "invalid_components" as const;

    if (removedIds.length) {
      await tx.delete(incidentComponent).where(and(
        eq(incidentComponent.incidentId, incidentId), inArray(incidentComponent.componentId, removedIds),
      ));
    }
    if (incoming.length) {
      await tx.insert(incidentComponent).values(incoming.map(({ componentId, status }) => ({
        incidentId, componentId, impact: status,
      }))).onConflictDoUpdate({
        target: [incidentComponent.incidentId, incidentComponent.componentId],
        set: { impact: sql`excluded.impact` },
      });
    }

    const [update] = await tx.insert(incidentUpdate).values({
      incidentId,
      status: input.status,
      message: input.message,
      componentsRecorded: true,
      createdAt: sql`clock_timestamp()`,
    }).returning({
      id: incidentUpdate.id, incidentId: incidentUpdate.incidentId,
      status: incidentUpdate.status, message: incidentUpdate.message, createdAt: incidentUpdate.createdAt,
    });
    const snapshot = await tx.select({
      componentId: component.id, name: component.name, impact: incidentComponent.impact,
    }).from(incidentComponent).innerJoin(component, eq(component.id, incidentComponent.componentId))
      .where(eq(incidentComponent.incidentId, incidentId));
    if (snapshot.length) {
      await tx.insert(incidentUpdateComponent).values(snapshot.map((entry) => ({ updateId: update.id, ...entry })));
    }
    await tx.update(incident).set({ status: input.status, updatedAt: update.createdAt })
      .where(eq(incident.id, incidentId));
    await recordComponentStates(tx, affectedIds, { type: "incident", id: incidentId });
    if (input.notifySubscribers) await enqueueStatusNotification(tx, pageId, update.id, {
      kind: "incident", title: existing.title, status: input.status, message: input.message,
      componentIds: [...new Set([...currentIds, ...finalIds])],
    });
    await recordPageActivity(tx, pageId, { actor, action: "incident.updated", resourceType: "incident", resourceId: incidentId, details: { updateId: update.id, status: input.status, notified: input.notifySubscribers ?? false } });
    return update;
  });
}

export async function listIncidents(pageId: string, options: IncidentHistoryQuery, publicOnly = false) {
  return db.transaction(async (tx) => {
    const conditions = [eq(incident.statusPageId, pageId)];
    if (publicOnly) conditions.push(eq(statusPage.published, true));
    if (options.state === "active") conditions.push(sql`${incident.status} <> 'resolved'`);
    if (options.state === "past") conditions.push(eq(incident.status, "resolved"));
    const sortDate = sql`coalesce(${incident.occurredAt}, ${incident.createdAt})`;
    if (options.cursor) conditions.push(sql`(${sortDate}, ${incident.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)`);
    const rows = await tx.select({
      id: incident.id, title: incident.title, status: incident.status,
      createdAt: incident.createdAt, updatedAt: incident.updatedAt, occurredAt: incident.occurredAt,
      cursorTimestamp: sql<string>`to_char(${sortDate} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    }).from(incident).innerJoin(statusPage, eq(statusPage.id, incident.statusPageId))
      .where(and(...conditions)).orderBy(desc(sortDate), desc(incident.id)).limit(options.limit + 1);
    const incidents = rows.slice(0, options.limit);
    const last = incidents.at(-1);
    const nextCursor = rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null;
    if (!incidents.length) return { data: [], nextCursor };

    const ids = incidents.map((item) => item.id);
    const updates = await tx.select({
      id: incidentUpdate.id, incidentId: incidentUpdate.incidentId,
      status: incidentUpdate.status, message: incidentUpdate.message, createdAt: incidentUpdate.createdAt,
      componentsRecorded: incidentUpdate.componentsRecorded,
    }).from(incidentUpdate).where(inArray(incidentUpdate.incidentId, ids))
      .orderBy(desc(incidentUpdate.createdAt), desc(incidentUpdate.id));
    const snapshots = updates.length ? await tx.select().from(incidentUpdateComponent)
      .where(inArray(incidentUpdateComponent.updateId, updates.map((update) => update.id)))
      .orderBy(incidentUpdateComponent.name, incidentUpdateComponent.componentId) : [];
    const components = await tx.select({
      incidentId: incidentComponent.incidentId, id: component.id, name: component.name, impact: incidentComponent.impact,
    }).from(incidentComponent).innerJoin(component, eq(component.id, incidentComponent.componentId))
      .where(inArray(incidentComponent.incidentId, ids)).orderBy(component.position, component.createdAt, component.id);
    const published = await tx.select({ incidentId: postmortem.incidentId, content: postmortem.publishedContent,
      publishedAt: postmortem.publishedAt, updatedAt: postmortem.publishedUpdatedAt }).from(postmortem)
      .where(and(inArray(postmortem.incidentId, ids), isNotNull(postmortem.publishedContent)));

    return { nextCursor, data: incidents.map(({ cursorTimestamp: _, ...item }) => ({
      ...item,
      postmortem: published.filter((entry) => entry.incidentId === item.id)
        .map(({ incidentId: _, ...entry }) => entry)[0] ?? null,
      updates: updates.filter((update) => update.incidentId === item.id)
        .map(({ incidentId: _, componentsRecorded, ...update }) => ({
          ...update,
          components: componentsRecorded
            ? snapshots.filter((entry) => entry.updateId === update.id)
              .map(({ componentId, name, impact }) => ({ id: componentId, name, impact }))
            : null,
        })),
      components: components.filter((entry) => entry.incidentId === item.id).map(({ incidentId: _, ...entry }) => entry),
    })) };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function listPublicIncidents(slug: string, options: IncidentHistoryQuery) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true))).limit(1);
  if (!page) return undefined;
  return listIncidents(page.id, options, true);
}
