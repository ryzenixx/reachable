import { and, eq, getTableColumns } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { componentGroup } from "../db/schema/component-group";
import { incidentComponent } from "../db/schema/incident";
import { maintenanceComponent } from "../db/schema/maintenance";
import { communicationTemplateComponent } from "../db/schema/template";
import type { CreateComponent, UpdateComponent } from "./validation";
import { effectiveComponentStatus } from "./status";
import { recordPageActivity, type Actor } from "../activity/record";
import { recordComponentStates } from "./history-record";

const componentFields = {
  ...getTableColumns(component),
  manualStatus: component.status,
  status: effectiveComponentStatus,
};

export function listComponents(pageId: string) {
  return db
    .select(componentFields)
    .from(component)
    .where(eq(component.statusPageId, pageId))
    .orderBy(component.position, component.createdAt, component.id);
}

export async function createComponent(pageId: string, input: CreateComponent, actorId: string) {
  return db.transaction(async (tx) => {
    if (input.groupId) {
      const [group] = await tx
        .select({ id: componentGroup.id })
        .from(componentGroup)
        .where(and(eq(componentGroup.id, input.groupId), eq(componentGroup.statusPageId, pageId)))
        .for("share");
      if (!group) return "invalid_group" as const;
    }
    const [created] = await tx
      .insert(component)
      .values({ ...input, statusPageId: pageId })
      .returning();
    await recordComponentStates(tx, [created.id], { type: "manual", id: created.id });
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "component.created",
      resourceType: "component",
      resourceId: created.id,
    });
    return { ...created, manualStatus: created.status };
  });
}

export async function updateComponent(
  pageId: string,
  componentId: string,
  input: UpdateComponent,
  actor: Actor,
) {
  const updated = await db.transaction(async (tx) => {
    if (input.groupId) {
      const [group] = await tx
        .select({ id: componentGroup.id })
        .from(componentGroup)
        .where(and(eq(componentGroup.id, input.groupId), eq(componentGroup.statusPageId, pageId)))
        .for("share");
      if (!group) return "invalid_group" as const;
    }
    const [previous] = await tx
      .select()
      .from(component)
      .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId)))
      .for("update");
    if (!previous) return undefined;
    const [row] = await tx
      .update(component)
      .set(input)
      .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId)))
      .returning();
    if (input.status !== undefined && input.status !== previous.status)
      await recordComponentStates(tx, [componentId], { type: "manual", id: componentId }, true);
    const fields = (Object.keys(input) as (keyof UpdateComponent)[]).filter(
      (field) => input[field] !== previous[field],
    );
    if (fields.length)
      await recordPageActivity(tx, pageId, {
        actor,
        action: "component.updated",
        resourceType: "component",
        resourceId: componentId,
        details: { fields, ...(input.status && { status: input.status }) },
      });
    return row;
  });
  if (!updated || updated === "invalid_group") return updated;
  const [current] = await db
    .select(componentFields)
    .from(component)
    .where(eq(component.id, updated.id));
  return current;
}

export async function deleteComponent(pageId: string, componentId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: component.id })
      .from(component)
      .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId)))
      .for("update");
    if (!existing) return "not_found" as const;
    const [incident] = await tx
      .select({ id: incidentComponent.incidentId })
      .from(incidentComponent)
      .where(eq(incidentComponent.componentId, componentId))
      .limit(1);
    const [maintenance] = await tx
      .select({ id: maintenanceComponent.maintenanceId })
      .from(maintenanceComponent)
      .where(eq(maintenanceComponent.componentId, componentId))
      .limit(1);
    const [template] = await tx
      .select({ id: communicationTemplateComponent.templateId })
      .from(communicationTemplateComponent)
      .where(eq(communicationTemplateComponent.componentId, componentId))
      .limit(1);
    if (incident || maintenance || template) return "in_use" as const;
    await tx.delete(component).where(eq(component.id, componentId));
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "component.deleted",
      resourceType: "component",
      resourceId: componentId,
    });
    return "deleted" as const;
  });
}
