import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { componentGroup } from "../db/schema/component-group";
import { component } from "../db/schema/component";
import type { CreateGroup, UpdateGroup } from "./validation";

export function listGroups(pageId: string) {
  return db.select().from(componentGroup).where(eq(componentGroup.statusPageId, pageId))
    .orderBy(componentGroup.position, componentGroup.createdAt, componentGroup.id);
}

export async function createGroup(pageId: string, input: CreateGroup) {
  const [group] = await db.insert(componentGroup).values({ ...input, statusPageId: pageId }).returning();
  return group;
}

export async function updateGroup(pageId: string, groupId: string, input: UpdateGroup) {
  const [group] = await db.update(componentGroup).set(input)
    .where(and(eq(componentGroup.id, groupId), eq(componentGroup.statusPageId, pageId))).returning();
  return group;
}

export async function deleteGroup(pageId: string, groupId: string) {
  return db.transaction(async (tx) => {
    const [group] = await tx.select({ id: componentGroup.id }).from(componentGroup)
      .where(and(eq(componentGroup.id, groupId), eq(componentGroup.statusPageId, pageId))).for("update");
    if (!group) return false;
    await tx.update(component).set({ groupId: null })
      .where(and(eq(component.groupId, groupId), eq(component.statusPageId, pageId)));
    await tx.delete(componentGroup).where(eq(componentGroup.id, groupId));
    return true;
  });
}
