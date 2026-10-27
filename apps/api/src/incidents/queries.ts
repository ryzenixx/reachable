import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { incident, incidentComponent, incidentUpdate } from "../db/schema/incident";
import { statusPage } from "../db/schema/status-page";
import type { CreateIncident, CreateIncidentUpdate } from "./validation";

export async function createIncident(pageId: string, input: CreateIncident) {
  return db.transaction(async (tx) => {
    if (input.componentIds.length) {
      const components = await tx.select({ id: component.id }).from(component)
        .where(and(eq(component.statusPageId, pageId), inArray(component.id, input.componentIds)))
        .for("share");
      if (components.length !== input.componentIds.length) return undefined;
    }

    const [created] = await tx.insert(incident).values({
      statusPageId: pageId,
      title: input.title,
      status: input.status,
    }).returning();
    await tx.insert(incidentUpdate).values({
      incidentId: created.id,
      status: input.status,
      message: input.message,
    });
    if (input.componentIds.length) {
      await tx.insert(incidentComponent).values(input.componentIds.map((componentId) => ({
        incidentId: created.id,
        componentId,
      })));
    }
    return created;
  });
}

export async function addIncidentUpdate(pageId: string, incidentId: string, input: CreateIncidentUpdate) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: incident.id }).from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId)))
      .for("update");
    if (!existing) return undefined;

    const [update] = await tx.insert(incidentUpdate).values({
      incidentId,
      ...input,
      createdAt: sql`clock_timestamp()`,
    }).returning();
    await tx.update(incident).set({ status: input.status, updatedAt: update.createdAt })
      .where(eq(incident.id, incidentId));
    return update;
  });
}

export async function listIncidents(pageId: string, publicOnly = false) {
  const conditions = [eq(incident.statusPageId, pageId)];
  if (publicOnly) conditions.push(eq(statusPage.published, true));
  const incidents = await db.select({
    id: incident.id, title: incident.title, status: incident.status,
    createdAt: incident.createdAt, updatedAt: incident.updatedAt,
  }).from(incident).innerJoin(statusPage, eq(statusPage.id, incident.statusPageId))
    .where(and(...conditions)).orderBy(desc(incident.createdAt), desc(incident.id));
  if (!incidents.length) return [];

  const ids = incidents.map((item) => item.id);
  const updates = await db.select({
    id: incidentUpdate.id, incidentId: incidentUpdate.incidentId,
    status: incidentUpdate.status, message: incidentUpdate.message, createdAt: incidentUpdate.createdAt,
  }).from(incidentUpdate).where(inArray(incidentUpdate.incidentId, ids))
    .orderBy(desc(incidentUpdate.createdAt), desc(incidentUpdate.id));
  const components = await db.select({
    incidentId: incidentComponent.incidentId, id: component.id, name: component.name,
  }).from(incidentComponent).innerJoin(component, eq(component.id, incidentComponent.componentId))
    .where(inArray(incidentComponent.incidentId, ids)).orderBy(component.position, component.createdAt, component.id);

  return incidents.map((item) => ({
    ...item,
    updates: updates.filter((update) => update.incidentId === item.id).map(({ incidentId: _, ...update }) => update),
    components: components.filter((entry) => entry.incidentId === item.id).map(({ incidentId: _, ...entry }) => entry),
  }));
}

export async function listPublicIncidents(slug: string) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true))).limit(1);
  if (!page) return undefined;
  return listIncidents(page.id, true);
}
