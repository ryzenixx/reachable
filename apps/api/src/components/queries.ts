import { and, eq, notExists } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { incidentComponent } from "../db/schema/incident";
import type { CreateComponent, UpdateComponent } from "./validation";

export function listComponents(pageId: string) {
  return db.select().from(component).where(eq(component.statusPageId, pageId))
    .orderBy(component.position, component.createdAt, component.id);
}

export async function createComponent(pageId: string, input: CreateComponent) {
  const [created] = await db.insert(component).values({ ...input, statusPageId: pageId }).returning();
  return created;
}

export async function updateComponent(pageId: string, componentId: string, input: UpdateComponent) {
  const [updated] = await db.update(component).set(input)
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId))).returning();
  return updated;
}

export async function deleteComponent(pageId: string, componentId: string) {
  const [deleted] = await db.delete(component)
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId), notExists(
      db.select({ id: incidentComponent.incidentId }).from(incidentComponent)
        .where(eq(incidentComponent.componentId, component.id)),
    )))
    .returning({ id: component.id });
  if (deleted) return "deleted";
  const [existing] = await db.select({ id: component.id }).from(component)
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId))).limit(1);
  return existing ? "in_use" : "not_found";
}
