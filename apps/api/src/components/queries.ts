import { and, eq, getTableColumns, notExists } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { componentGroup } from "../db/schema/component-group";
import { incidentComponent } from "../db/schema/incident";
import { maintenanceComponent } from "../db/schema/maintenance";
import type { CreateComponent, UpdateComponent } from "./validation";
import { effectiveComponentStatus } from "./status";

const componentFields = {
  ...getTableColumns(component),
  manualStatus: component.status,
  status: effectiveComponentStatus,
};

export function listComponents(pageId: string) {
  return db.select(componentFields).from(component).where(eq(component.statusPageId, pageId))
    .orderBy(component.position, component.createdAt, component.id);
}

export async function createComponent(pageId: string, input: CreateComponent) {
  return db.transaction(async (tx) => {
    if (input.groupId) {
      const [group] = await tx.select({ id: componentGroup.id }).from(componentGroup)
        .where(and(eq(componentGroup.id, input.groupId), eq(componentGroup.statusPageId, pageId))).for("share");
      if (!group) return "invalid_group" as const;
    }
    const [created] = await tx.insert(component).values({ ...input, statusPageId: pageId }).returning();
    return { ...created, manualStatus: created.status };
  });
}

export async function updateComponent(pageId: string, componentId: string, input: UpdateComponent) {
  const updated = await db.transaction(async (tx) => {
    if (input.groupId) {
      const [group] = await tx.select({ id: componentGroup.id }).from(componentGroup)
        .where(and(eq(componentGroup.id, input.groupId), eq(componentGroup.statusPageId, pageId))).for("share");
      if (!group) return "invalid_group" as const;
    }
    const [row] = await tx.update(component).set(input)
      .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId))).returning();
    return row;
  });
  if (!updated || updated === "invalid_group") return updated;
  const [current] = await db.select(componentFields).from(component).where(eq(component.id, updated.id));
  return current;
}

export async function deleteComponent(pageId: string, componentId: string) {
  const [deleted] = await db.delete(component)
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId), notExists(
      db.select({ id: incidentComponent.incidentId }).from(incidentComponent)
        .where(eq(incidentComponent.componentId, component.id)),
    ), notExists(
      db.select({ id: maintenanceComponent.maintenanceId }).from(maintenanceComponent)
        .where(eq(maintenanceComponent.componentId, component.id)),
    )))
    .returning({ id: component.id });
  if (deleted) return "deleted";
  const [existing] = await db.select({ id: component.id }).from(component)
    .where(and(eq(component.id, componentId), eq(component.statusPageId, pageId))).limit(1);
  return existing ? "in_use" : "not_found";
}
