import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery } from "../db/schema/notification";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription } from "../db/schema/subscription";
import { recordPageActivity } from "../activity/record";
import { incident, incidentUpdate } from "../db/schema/incident";
import { maintenance, maintenanceUpdate } from "../db/schema/maintenance";
import { postmortem, postmortemPublication } from "../db/schema/postmortem";

export async function retryNotification(pageId: string, deliveryId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(notificationDelivery).innerJoin(subscription, eq(subscription.id, notificationDelivery.subscriptionId))
      .where(and(eq(notificationDelivery.id, deliveryId), eq(subscription.statusPageId, pageId)))
      .for("update", { of: notificationDelivery });
    if (!delivery) return "not_found" as const;
    if (delivery.notification_delivery.status !== "failed") return "not_failed" as const;
    const [recipient] = await tx.select().from(subscription).where(eq(subscription.id, delivery.subscription.id)).for("update");
    if (!recipient?.confirmedAt) return "unavailable" as const;
    const [page] = await tx.select({ published: statusPage.published, enabled: organizationChannel.enabled }).from(statusPage)
      .leftJoin(organizationChannel, and(eq(organizationChannel.organizationId, statusPage.organizationId), eq(organizationChannel.channel, recipient.channel)))
      .where(eq(statusPage.id, pageId));
    if (!page?.published || !page.enabled) return "unavailable" as const;
    const [later] = await tx.select({ id: notificationDelivery.id }).from(notificationDelivery)
      .where(and(eq(notificationDelivery.subscriptionId, recipient.id), sql`(${notificationDelivery.createdAt}, ${notificationDelivery.id}) >
        (select created_at, id from notification_delivery where id = ${deliveryId}::uuid)`,
      sql`(${notificationDelivery.status} = 'pending' or ${notificationDelivery.attempts} > 0)`)).limit(1);
    if (later) return "newer_delivery" as const;
    const payload = delivery.notification_delivery.payload;
    const eventId = delivery.notification_delivery.eventId;
    if (payload.kind === "incident") {
      const [source] = await tx.select({ title: incident.title, message: incidentUpdate.message }).from(incidentUpdate)
        .innerJoin(incident, eq(incident.id, incidentUpdate.incidentId))
        .where(and(eq(incidentUpdate.id, eventId), eq(incident.statusPageId, pageId)));
      if (!source) return "outdated" as const;
      Object.assign(payload, source);
    } else if (payload.kind === "maintenance") {
      const [source] = await tx.select({ title: maintenance.title, message: maintenanceUpdate.message,
        currentStatus: maintenance.status, updateStatus: maintenanceUpdate.status }).from(maintenanceUpdate)
        .innerJoin(maintenance, eq(maintenance.id, maintenanceUpdate.maintenanceId))
        .where(and(eq(maintenanceUpdate.id, eventId), eq(maintenance.statusPageId, pageId)));
      if (!source || (source.currentStatus === "cancelled" && source.updateStatus !== "cancelled")) return "outdated" as const;
      payload.title = source.title;
      payload.message = source.message;
    } else if (payload.kind === "postmortem") {
      const [source] = await tx.select({ title: incident.title, message: postmortem.publishedContent }).from(postmortemPublication)
        .innerJoin(postmortem, eq(postmortem.id, postmortemPublication.postmortemId))
        .innerJoin(incident, eq(incident.id, postmortem.incidentId))
        .where(and(eq(postmortemPublication.id, eventId), eq(incident.statusPageId, pageId),
          eq(postmortemPublication.createdAt, postmortem.publishedUpdatedAt)));
      if (!source?.message) return "outdated" as const;
      payload.title = source.title;
      payload.message = source.message;
    }
    await tx.update(notificationDelivery).set({ status: "pending", cycleAttempts: 0, payload, nextAttemptAt: sql`now()`, processedAt: null })
      .where(eq(notificationDelivery.id, deliveryId));
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "notification.retry_requested",
      resourceType: "notification_delivery", resourceId: deliveryId, details: { attempts: delivery.notification_delivery.attempts } });
    return "queued" as const;
  });
}
