import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import {
  maintenance,
  maintenanceComponent,
  maintenanceReminder,
  maintenanceUpdate,
  maintenanceUpdateComponent,
} from "../db/schema/maintenance";
import { enqueueStatusNotification } from "../notifications/queue";
import { recordPageActivity } from "../activity/record";
import { lockHistoryComponents, recordComponentStates } from "../components/history-record";

export async function processDueMaintenance() {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(maintenance)
      .where(
        or(
          and(
            eq(maintenance.status, "scheduled"),
            eq(maintenance.autoStart, true),
            lte(maintenance.startsAt, sql`now()`),
            sql`${maintenance.endsAt} > now()`,
          ),
          and(
            inArray(maintenance.status, ["in_progress", "verifying"]),
            eq(maintenance.autoComplete, true),
            lte(maintenance.endsAt, sql`now()`),
          ),
        ),
      )
      .orderBy(asc(maintenance.startsAt), asc(maintenance.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!current) return false;

    const linked = await tx
      .select({ id: maintenanceComponent.componentId })
      .from(maintenanceComponent)
      .where(eq(maintenanceComponent.maintenanceId, current.id));
    await lockHistoryComponents(
      tx,
      current.statusPageId,
      linked.map(({ id }) => id),
    );

    const status = current.status === "scheduled" ? "in_progress" : "completed";
    const message =
      status === "in_progress"
        ? "Maintenance status automatically changed to in progress."
        : "Maintenance status automatically changed to completed.";
    const [update] = await tx
      .insert(maintenanceUpdate)
      .values({
        maintenanceId: current.id,
        status,
        message,
        automated: true,
        startsAt: current.startsAt,
        endsAt: current.endsAt,
        createdAt: sql`clock_timestamp()`,
      })
      .returning({ id: maintenanceUpdate.id, createdAt: maintenanceUpdate.createdAt });
    const components = await tx
      .select({ componentId: component.id, name: component.name })
      .from(maintenanceComponent)
      .innerJoin(component, eq(component.id, maintenanceComponent.componentId))
      .where(eq(maintenanceComponent.maintenanceId, current.id));
    if (components.length)
      await tx
        .insert(maintenanceUpdateComponent)
        .values(components.map((entry) => ({ updateId: update.id, ...entry })));
    await tx
      .update(maintenance)
      .set({ status, updatedAt: update.createdAt })
      .where(eq(maintenance.id, current.id));
    await recordComponentStates(
      tx,
      linked.map(({ id }) => id),
      { type: "maintenance", id: current.id },
      current.notifyOnAutoTransition,
    );
    if (current.notifyOnAutoTransition)
      await enqueueStatusNotification(tx, current.statusPageId, update.id, {
        kind: "maintenance",
        title: current.title,
        status,
        message,
        startsAt: current.startsAt.toISOString(),
        endsAt: current.endsAt.toISOString(),
        componentIds: components.map((entry) => entry.componentId),
      });
    await recordPageActivity(tx, current.statusPageId, {
      actor: { type: "system" },
      action: "maintenance.auto_transitioned",
      resourceType: "maintenance",
      resourceId: current.id,
      details: { updateId: update.id, status, notified: current.notifyOnAutoTransition },
    });
    return true;
  });
}

export async function processDueMaintenanceReminder() {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(maintenance)
      .where(
        and(
          eq(maintenance.status, "scheduled"),
          sql`${maintenance.reminderMinutes} is not null`,
          sql`${maintenance.startsAt} > now()`,
          sql`${maintenance.startsAt} <= now() + ${maintenance.reminderMinutes} * interval '1 minute'`,
          sql`not exists (select 1 from ${maintenanceReminder} where ${maintenanceReminder.maintenanceId} = ${maintenance.id} and ${maintenanceReminder.startsAt} = ${maintenance.startsAt})`,
        ),
      )
      .orderBy(asc(maintenance.startsAt), asc(maintenance.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!current) return false;
    const [reminder] = await tx
      .insert(maintenanceReminder)
      .values({ maintenanceId: current.id, startsAt: current.startsAt })
      .returning({ id: maintenanceReminder.id });
    const components = await tx
      .select({ id: maintenanceComponent.componentId })
      .from(maintenanceComponent)
      .where(eq(maintenanceComponent.maintenanceId, current.id));
    await enqueueStatusNotification(tx, current.statusPageId, reminder.id, {
      kind: "maintenance_reminder",
      maintenanceId: current.id,
      title: current.title,
      status: current.status,
      message: "This scheduled maintenance will begin soon.",
      startsAt: current.startsAt.toISOString(),
      endsAt: current.endsAt.toISOString(),
      componentIds: components.map(({ id }) => id),
    });
    await recordPageActivity(tx, current.statusPageId, {
      actor: { type: "system" },
      action: "maintenance.reminder_queued",
      resourceType: "maintenance",
      resourceId: current.id,
      details: { reminderId: reminder.id },
    });
    return true;
  });
}
