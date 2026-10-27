import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { incidentEdit } from "../db/schema/content-edit";
import { incident, incidentUpdate } from "../db/schema/incident";
import { correctPendingNotifications } from "../notifications/corrections";

export async function editIncidentTitle(pageId: string, incidentId: string, actorId: string, title: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    if (current.title === title) return current;
    const [updated] = await tx.update(incident).set({ title, updatedAt: sql`clock_timestamp()` })
      .where(eq(incident.id, incidentId)).returning();
    await tx.insert(incidentEdit).values({ incidentId, field: "title", previousValue: current.title, newValue: title, actorId });
    await correctPendingNotifications(tx, sql`select ${incidentUpdate.id} from ${incidentUpdate} where ${incidentUpdate.incidentId} = ${incidentId}::uuid`, "title", title);
    return updated;
  });
}

export async function editIncidentMessage(pageId: string, incidentId: string, updateId: string, actorId: string, message: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: incident.id }).from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    const fields = { id: incidentUpdate.id, incidentId: incidentUpdate.incidentId, status: incidentUpdate.status,
      message: incidentUpdate.message, createdAt: incidentUpdate.createdAt };
    const [update] = await tx.select(fields).from(incidentUpdate)
      .where(and(eq(incidentUpdate.id, updateId), eq(incidentUpdate.incidentId, incidentId)));
    if (!update) return undefined;
    if (update.message === message) return update;
    const [updated] = await tx.update(incidentUpdate).set({ message }).where(eq(incidentUpdate.id, updateId)).returning(fields);
    await tx.update(incident).set({ updatedAt: sql`clock_timestamp()` }).where(eq(incident.id, incidentId));
    await tx.insert(incidentEdit).values({ incidentId, updateId, field: "message", previousValue: update.message, newValue: message, actorId });
    await correctPendingNotifications(tx, sql`select ${updateId}::uuid`, "message", message);
    return updated;
  });
}

export async function listIncidentEdits(pageId: string, incidentId: string) {
  const [current] = await db.select({ id: incident.id }).from(incident)
    .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId)));
  if (!current) return undefined;
  return db.select().from(incidentEdit).where(eq(incidentEdit.incidentId, incidentId))
    .orderBy(desc(incidentEdit.createdAt), desc(incidentEdit.id));
}
