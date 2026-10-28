import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { maintenanceEdit } from "../db/schema/content-edit";
import { maintenance, maintenanceReminder, maintenanceUpdate } from "../db/schema/maintenance";
import { correctPendingNotifications } from "../notifications/corrections";

export async function editMaintenanceTitle(pageId: string, maintenanceId: string, actorId: string, title: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(maintenance)
      .where(and(eq(maintenance.id, maintenanceId), eq(maintenance.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    if (current.title === title) return current;
    const [updated] = await tx.update(maintenance).set({ title, updatedAt: sql`clock_timestamp()` })
      .where(eq(maintenance.id, maintenanceId)).returning();
    await tx.insert(maintenanceEdit).values({ maintenanceId, field: "title", previousValue: current.title, newValue: title, actorId });
    await correctPendingNotifications(tx, sql`select ${maintenanceUpdate.id} from ${maintenanceUpdate} where ${maintenanceUpdate.maintenanceId} = ${maintenanceId}::uuid`, "title", title);
    await correctPendingNotifications(tx, sql`select ${maintenanceReminder.id} from ${maintenanceReminder} where ${maintenanceReminder.maintenanceId} = ${maintenanceId}::uuid`, "title", title);
    return updated;
  });
}

export async function editMaintenanceMessage(pageId: string, maintenanceId: string, updateId: string, actorId: string, message: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: maintenance.id }).from(maintenance)
      .where(and(eq(maintenance.id, maintenanceId), eq(maintenance.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    const [update] = await tx.select().from(maintenanceUpdate)
      .where(and(eq(maintenanceUpdate.id, updateId), eq(maintenanceUpdate.maintenanceId, maintenanceId)));
    if (!update) return undefined;
    if (update.message === message) return update;
    const [updated] = await tx.update(maintenanceUpdate).set({ message }).where(eq(maintenanceUpdate.id, updateId)).returning();
    await tx.update(maintenance).set({ updatedAt: sql`clock_timestamp()` }).where(eq(maintenance.id, maintenanceId));
    await tx.insert(maintenanceEdit).values({ maintenanceId, updateId, field: "message", previousValue: update.message, newValue: message, actorId });
    await correctPendingNotifications(tx, sql`select ${updateId}::uuid`, "message", message);
    return updated;
  });
}

export async function listMaintenanceEdits(pageId: string, maintenanceId: string) {
  const [current] = await db.select({ id: maintenance.id }).from(maintenance)
    .where(and(eq(maintenance.id, maintenanceId), eq(maintenance.statusPageId, pageId)));
  if (!current) return undefined;
  return db.select().from(maintenanceEdit).where(eq(maintenanceEdit.maintenanceId, maintenanceId))
    .orderBy(desc(maintenanceEdit.createdAt), desc(maintenanceEdit.id));
}
