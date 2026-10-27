import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { statusPage } from "../db/schema/status-page";
import type { CreateComponent, UpdateComponent } from "./validation";

export async function pageBelongsToOrganization(pageId: string, organizationId: string) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId)))
    .limit(1);
  return Boolean(page);
}

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
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId)))
    .returning({ id: component.id });
  return Boolean(deleted);
}
