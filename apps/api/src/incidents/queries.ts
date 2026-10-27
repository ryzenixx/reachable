import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { incident, incidentComponent, incidentUpdate, incidentUpdateComponent } from "../db/schema/incident";
import { statusPage } from "../db/schema/status-page";
import { postmortem } from "../db/schema/postmortem";
import type { CreateIncident, CreateIncidentUpdate } from "./validation";
import { enqueueStatusNotification } from "../notifications/queue";

export async function createIncident(pageId: string, input: CreateIncident) {
  return db.transaction(async (tx) => {
    const componentIds = input.components.map((entry) => entry.componentId);
    let components: { id: string; name: string }[] = [];
    if (componentIds.length) {
      components = await tx.select({ id: component.id, name: component.name }).from(component)
        .where(and(eq(component.statusPageId, pageId), inArray(component.id, componentIds)))
        .orderBy(component.id).for("share");
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
    if (input.notifySubscribers) await enqueueStatusNotification(tx, pageId, update.id, {
      kind: "incident", title: created.title, status: input.status, message: input.message, componentIds,
    });
    return created;
  });
}

export async function addIncidentUpdate(pageId: string, incidentId: string, input: CreateIncidentUpdate) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: incident.id, title: incident.title }).from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId)))
      .for("update");
    if (!existing) return undefined;

    const linked = await tx.select({ id: incidentComponent.componentId }).from(incidentComponent)
      .where(eq(incidentComponent.incidentId, incidentId));
    const currentIds = new Set(linked.map((entry) => entry.id));
    const removedIds = input.removedComponentIds ?? [];
    if (removedIds.some((id) => !currentIds.has(id))) return "invalid_components" as const;

    const incoming = input.components ?? [];
    const incomingIds = incoming.map((entry) => entry.componentId);
    if (incomingIds.length) {
      const valid = await tx.select({ id: component.id }).from(component)
        .where(and(eq(component.statusPageId, pageId), inArray(component.id, incomingIds)))
        .orderBy(component.id).for("share");
      if (valid.length !== incomingIds.length) return "invalid_components" as const;
    }

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
    if (input.notifySubscribers) await enqueueStatusNotification(tx, pageId, update.id, {
      kind: "incident", title: existing.title, status: input.status, message: input.message,
      componentIds: [...new Set([...currentIds, ...finalIds])],
    });
    return update;
  });
}

export async function listIncidents(pageId: string, publicOnly = false) {
  return db.transaction(async (tx) => {
    const conditions = [eq(incident.statusPageId, pageId)];
    if (publicOnly) conditions.push(eq(statusPage.published, true));
    const incidents = await tx.select({
      id: incident.id, title: incident.title, status: incident.status,
      createdAt: incident.createdAt, updatedAt: incident.updatedAt,
    }).from(incident).innerJoin(statusPage, eq(statusPage.id, incident.statusPageId))
      .where(and(...conditions)).orderBy(desc(incident.createdAt), desc(incident.id));
    if (!incidents.length) return [];

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

    return incidents.map((item) => ({
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
    }));
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function listPublicIncidents(slug: string) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true))).limit(1);
  if (!page) return undefined;
  return listIncidents(page.id, true);
}
