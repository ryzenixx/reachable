import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { maintenance, maintenanceComponent, maintenanceUpdate, maintenanceUpdateComponent } from "../db/schema/maintenance";
import { enqueueStatusNotification } from "../notifications/queue";

export async function processDueMaintenance() {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(maintenance).where(or(
      and(eq(maintenance.status, "scheduled"), eq(maintenance.autoStart, true),
        lte(maintenance.startsAt, sql`now()`), sql`${maintenance.endsAt} > now()`),
      and(inArray(maintenance.status, ["in_progress", "verifying"]),
        eq(maintenance.autoComplete, true), lte(maintenance.endsAt, sql`now()`)),
    )).orderBy(asc(maintenance.startsAt), asc(maintenance.id)).limit(1).for("update", { skipLocked: true });
    if (!current) return false;

    const status = current.status === "scheduled" ? "in_progress" : "completed";
    const message = status === "in_progress"
      ? "Maintenance status automatically changed to in progress."
      : "Maintenance status automatically changed to completed.";
    const [update] = await tx.insert(maintenanceUpdate).values({
      maintenanceId: current.id, status, message, automated: true,
      startsAt: current.startsAt, endsAt: current.endsAt, createdAt: sql`clock_timestamp()`,
    }).returning({ id: maintenanceUpdate.id, createdAt: maintenanceUpdate.createdAt });
    const components = await tx.select({ componentId: component.id, name: component.name }).from(maintenanceComponent)
      .innerJoin(component, eq(component.id, maintenanceComponent.componentId))
      .where(eq(maintenanceComponent.maintenanceId, current.id));
    if (components.length) await tx.insert(maintenanceUpdateComponent)
      .values(components.map((entry) => ({ updateId: update.id, ...entry })));
    await tx.update(maintenance).set({ status, updatedAt: update.createdAt }).where(eq(maintenance.id, current.id));
    if (current.notifyOnAutoTransition) await enqueueStatusNotification(tx, current.statusPageId, update.id, {
      kind: "maintenance", title: current.title, status, message,
      startsAt: current.startsAt.toISOString(), endsAt: current.endsAt.toISOString(),
      componentIds: components.map((entry) => entry.componentId),
    });
    return true;
  });
}
