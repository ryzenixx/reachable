import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery } from "../db/schema/notification";
import { maintenance } from "../db/schema/maintenance";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription, subscriptionComponent, subscriptionToken, webhookSubscription } from "../db/schema/subscription";
import { hashToken, tokenUrl } from "../subscriptions/tokens";
import { sendStatusUpdate } from "./email/messages";
import { getPageEmailBrand } from "../branding/email";
import { sendWebhook } from "../webhooks/transport";
import { readWebhookSecret } from "../webhooks/secrets";
import { describeFailure } from "./failures";

async function claimDelivery() {
  return db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(notificationDelivery).where(and(
      eq(notificationDelivery.status, "pending"), lte(notificationDelivery.nextAttemptAt, sql`now()`),
      sql`not exists (
        select 1 from notification_delivery as previous
        where previous.subscription_id = ${notificationDelivery.subscriptionId}
          and previous.status = 'pending'
          and (previous.created_at, previous.id) < (${notificationDelivery.createdAt}, ${notificationDelivery.id})
      )`,
    )).orderBy(asc(notificationDelivery.createdAt), asc(notificationDelivery.id)).limit(1).for("update", { skipLocked: true });
    if (!delivery) return undefined;
    const [recipient] = await tx.select({ id: subscription.id }).from(subscription)
      .where(eq(subscription.id, delivery.subscriptionId)).for("no key update", { skipLocked: true });
    if (!recipient) return undefined;
    const token = randomBytes(32).toString("base64url");
    await tx.insert(subscriptionToken).values({ hash: hashToken(token), subscriptionId: delivery.subscriptionId, purpose: "unsubscribe" });
    const [claimed] = await tx.update(notificationDelivery)
      .set({ nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'` })
      .where(eq(notificationDelivery.id, delivery.id)).returning({ leaseUntil: notificationDelivery.nextAttemptAt });
    return { id: delivery.id, leaseUntil: claimed.leaseUntil, token };
  });
}

export async function processNotificationDelivery() {
  const claim = await claimDelivery();
  if (!claim) return false;
  await db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(notificationDelivery).where(and(
      eq(notificationDelivery.id, claim.id), eq(notificationDelivery.status, "pending"),
      eq(notificationDelivery.nextAttemptAt, claim.leaseUntil),
    )).for("update");
    if (!delivery) return;
    const postpone = async () => {
      await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
      await tx.update(notificationDelivery)
        .set({ nextAttemptAt: sql`now() + interval '10 seconds'` }).where(eq(notificationDelivery.id, delivery.id));
    };
    if (delivery.payload.kind === "maintenance_reminder") {
      const [current] = await tx.select().from(maintenance)
        .where(eq(maintenance.id, delivery.payload.maintenanceId ?? "00000000-0000-0000-0000-000000000000"))
        .for("share", { skipLocked: true });
      if (!current) {
        const [exists] = await tx.select({ id: maintenance.id }).from(maintenance)
          .where(eq(maintenance.id, delivery.payload.maintenanceId ?? "00000000-0000-0000-0000-000000000000"));
        if (exists) { await postpone(); return; }
      }
      if (!current || current.status !== "scheduled" || current.reminderMinutes === null ||
        current.startsAt.toISOString() !== delivery.payload.startsAt || current.endsAt.toISOString() !== delivery.payload.endsAt ||
        current.startsAt <= new Date() || current.startsAt.getTime() > Date.now() + current.reminderMinutes * 60_000) {
        await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
        await tx.update(notificationDelivery).set({ status: "skipped", processedAt: sql`clock_timestamp()` })
          .where(eq(notificationDelivery.id, delivery.id));
        return;
      }
    }
    const [recipient] = await tx.select().from(subscription).where(eq(subscription.id, delivery.subscriptionId))
      .for("update", { skipLocked: true });
    if (!recipient) { await postpone(); return; }
    const [page] = await tx.select().from(statusPage).where(eq(statusPage.id, recipient.statusPageId))
      .for("share", { skipLocked: true });
    if (!page) { await postpone(); return; }
    const [channel] = await tx.select().from(organizationChannel)
      .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, recipient.channel)))
      .for("share", { skipLocked: true });
    if (!channel) {
      const [exists] = await tx.select({ enabled: organizationChannel.enabled }).from(organizationChannel)
        .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, recipient.channel)));
      if (exists) { await postpone(); return; }
    }
    let relevant = true;
    if (!recipient.allComponents && delivery.payload.componentIds?.length) {
      const [match] = await tx.select({ id: subscriptionComponent.componentId }).from(subscriptionComponent)
        .where(and(eq(subscriptionComponent.subscriptionId, recipient.id), inArray(subscriptionComponent.componentId, delivery.payload.componentIds))).limit(1);
      relevant = Boolean(match);
    }
    if (!page.published || !channel?.enabled || !recipient.confirmedAt || !["email", "webhook"].includes(recipient.channel) || !relevant) {
      await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
      await tx.update(notificationDelivery).set({ status: "skipped", processedAt: sql`clock_timestamp()` })
        .where(eq(notificationDelivery.id, delivery.id));
      return;
    }
    const attempts = delivery.attempts + 1;
    const cycleAttempts = delivery.cycleAttempts + 1;
    try {
      if (recipient.channel === "email") {
        const brand = await getPageEmailBrand(tx, page.id, page.name);
        await sendStatusUpdate(recipient.destination, { ...delivery.payload, pageName: page.name }, tokenUrl("unsubscribe", claim.token), tokenUrl("manage", claim.token), brand);
      } else {
        const [webhook] = await tx.select().from(webhookSubscription).where(eq(webhookSubscription.subscriptionId, recipient.id));
        if (!webhook) throw new Error("Webhook subscription is missing");
        const body = JSON.stringify({ type: `status.${delivery.payload.kind}`, timestamp: delivery.createdAt.toISOString(),
          data: { ...delivery.payload, pageName: page.name, pageId: page.id, pageSlug: page.slug } });
        await sendWebhook(recipient.destination, readWebhookSecret(webhook.encryptedSecret, recipient.id), delivery.eventId, body);
        await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
      }
    } catch (error) {
      if (recipient.channel === "webhook") await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
      const failure = describeFailure(error, recipient.channel === "webhook" ? "webhook" : "email");
      const failed = failure.permanent || cycleAttempts >= 8;
      const delaySeconds = Math.min(60 * 2 ** (cycleAttempts - 1), 3600);
      await tx.update(notificationDelivery).set({ status: failed ? "failed" : "pending", attempts, cycleAttempts,
        lastFailureCode: failure.code, lastResponseCode: failure.responseCode, lastFailureAt: sql`clock_timestamp()`,
        nextAttemptAt: sql`now() + ${delaySeconds} * interval '1 second'`,
        processedAt: failed ? sql`clock_timestamp()` : null,
      }).where(eq(notificationDelivery.id, delivery.id));
      console.error(`Notification delivery ${delivery.id} failed${failed ? " permanently" : "; it will be retried"}`);
      return;
    }
    await tx.update(notificationDelivery).set({ status: "sent", attempts, cycleAttempts, processedAt: sql`clock_timestamp()` })
      .where(eq(notificationDelivery.id, delivery.id));
  });
  return true;
}
