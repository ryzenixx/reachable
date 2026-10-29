import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { componentGroup } from "../db/schema/component-group";
import { component } from "../db/schema/component";
import type { CreateGroup, UpdateGroup } from "./validation";
import { recordPageActivity } from "../activity/record";

export function listGroups(pageId: string) {
  return db
    .select()
    .from(componentGroup)
    .where(eq(componentGroup.statusPageId, pageId))
    .orderBy(componentGroup.position, componentGroup.createdAt, componentGroup.id);
}

export async function createGroup(pageId: string, input: CreateGroup, actorId: string) {
  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(componentGroup)
      .values({ ...input, statusPageId: pageId })
      .returning();
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "component_group.created",
      resourceType: "component_group",
      resourceId: group.id,
    });
    return group;
  });
}

export async function updateGroup(
  pageId: string,
  groupId: string,
  input: UpdateGroup,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(componentGroup)
      .where(and(eq(componentGroup.id, groupId), eq(componentGroup.statusPageId, pageId)))
      .for("update");
    if (!current) return undefined;
    const [group] = await tx
      .update(componentGroup)
      .set(input)
      .where(eq(componentGroup.id, groupId))
      .returning();
    const fields = (Object.keys(input) as (keyof UpdateGroup)[]).filter(
      (field) => input[field] !== current[field],
    );
    if (fields.length)
      await recordPageActivity(tx, pageId, {
        actor: { type: "member", id: actorId },
        action: "component_group.updated",
        resourceType: "component_group",
        resourceId: groupId,
        details: { fields },
      });
    return group;
  });
}

export async function deleteGroup(pageId: string, groupId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: componentGroup.id })
      .from(componentGroup)
      .where(and(eq(componentGroup.id, groupId), eq(componentGroup.statusPageId, pageId)))
      .for("update");
    if (!group) return false;
    await tx
      .update(component)
      .set({ groupId: null })
      .where(and(eq(component.groupId, groupId), eq(component.statusPageId, pageId)));
    await tx.delete(componentGroup).where(eq(componentGroup.id, groupId));
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "component_group.deleted",
      resourceType: "component_group",
      resourceId: groupId,
    });
    return true;
  });
}
