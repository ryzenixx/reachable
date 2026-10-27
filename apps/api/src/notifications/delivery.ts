import { randomBytes } from "node:crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery } from "../db/schema/notification";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription, subscriptionToken } from "../db/schema/subscription";
import { hashToken, tokenUrl } from "../subscriptions/tokens";
import { sendStatusUpdate } from "./email/messages";

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
    if (!page.published || !channel?.enabled || !recipient.confirmedAt || recipient.channel !== "email") {
      await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(claim.token)));
      await tx.update(notificationDelivery).set({ status: "skipped", processedAt: sql`clock_timestamp()` })
        .where(eq(notificationDelivery.id, delivery.id));
      return;
    }
    const attempts = delivery.attempts + 1;
    try {
      await sendStatusUpdate(recipient.destination, delivery.payload, tokenUrl("unsubscribe", claim.token));
    } catch {
      const failed = attempts >= 8;
      const delaySeconds = Math.min(60 * 2 ** (attempts - 1), 3600);
      await tx.update(notificationDelivery).set({ status: failed ? "failed" : "pending", attempts,
        nextAttemptAt: sql`now() + ${delaySeconds} * interval '1 second'`,
        processedAt: failed ? sql`clock_timestamp()` : null,
      }).where(eq(notificationDelivery.id, delivery.id));
      console.error(`Notification delivery ${delivery.id} failed${failed ? " permanently" : "; it will be retried"}`);
      return;
    }
    await tx.update(notificationDelivery).set({ status: "sent", attempts, processedAt: sql`clock_timestamp()` })
      .where(eq(notificationDelivery.id, delivery.id));
  });
  return true;
}
