import { randomBytes } from "node:crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { confirmationDelivery } from "../db/schema/notification";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription, subscriptionToken, webhookSubscription } from "../db/schema/subscription";
import { hashToken, tokenUrl } from "../subscriptions/tokens";
import { sendSubscriptionConfirmation } from "./email/messages";
import { getPageEmailBrand } from "../branding/email";
import { describeFailure } from "./failures";

async function claimConfirmation() {
  return db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(confirmationDelivery).where(and(
      eq(confirmationDelivery.status, "pending"), lte(confirmationDelivery.nextAttemptAt, sql`now()`),
    )).orderBy(asc(confirmationDelivery.nextAttemptAt), asc(confirmationDelivery.id)).limit(1).for("update", { skipLocked: true });
    if (!delivery) return undefined;
    if (delivery.expiresAt <= new Date()) {
      await tx.update(confirmationDelivery).set({ status: "failed", reason: "expired", processedAt: sql`clock_timestamp()` })
        .where(eq(confirmationDelivery.id, delivery.id));
      return { expired: true as const };
    }
    const [recipient] = await tx.select({ id: subscription.id }).from(subscription)
      .where(eq(subscription.id, delivery.subscriptionId)).for("update", { skipLocked: true });
    if (!recipient) {
      await tx.update(confirmationDelivery).set({ nextAttemptAt: sql`now() + interval '10 seconds'` })
        .where(eq(confirmationDelivery.id, delivery.id));
      return { postponed: true as const };
    }
    const confirm = randomBytes(32).toString("base64url");
    const unsubscribe = randomBytes(32).toString("base64url");
    await tx.insert(subscriptionToken).values([
      { hash: hashToken(confirm), subscriptionId: recipient.id, purpose: "confirm", expiresAt: sql`now() + interval '24 hours'` },
      { hash: hashToken(unsubscribe), subscriptionId: recipient.id, purpose: "unsubscribe" },
    ]);
    const [claimed] = await tx.update(confirmationDelivery)
      .set({ nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'` })
      .where(eq(confirmationDelivery.id, delivery.id)).returning({ leaseUntil: confirmationDelivery.nextAttemptAt });
    return { id: delivery.id, leaseUntil: claimed.leaseUntil, confirm, unsubscribe };
  });
}

export async function processConfirmationDelivery() {
  const claim = await claimConfirmation();
  if (!claim) return false;
  if ("expired" in claim || "postponed" in claim) return true;
  await db.transaction(async (tx) => {
    const [delivery] = await tx.select().from(confirmationDelivery).where(and(eq(confirmationDelivery.id, claim.id),
      eq(confirmationDelivery.status, "pending"), eq(confirmationDelivery.nextAttemptAt, claim.leaseUntil))).for("update");
    if (!delivery) {
      await tx.delete(subscriptionToken).where(sql`${subscriptionToken.hash} in (${hashToken(claim.confirm)}, ${hashToken(claim.unsubscribe)})`);
      return;
    }
    const discardTokens = async () => {
      await tx.delete(subscriptionToken).where(sql`${subscriptionToken.hash} in (${hashToken(claim.confirm)}, ${hashToken(claim.unsubscribe)})`);
    };
    const postpone = async () => {
      await discardTokens();
      await tx.update(confirmationDelivery).set({ nextAttemptAt: sql`now() + interval '10 seconds'` })
        .where(eq(confirmationDelivery.id, delivery.id));
    };
    const [recipient] = await tx.select().from(subscription).where(eq(subscription.id, delivery.subscriptionId))
      .for("update", { skipLocked: true });
    if (!recipient) { await postpone(); return; }
    const [page] = await tx.select().from(statusPage).where(eq(statusPage.id, recipient.statusPageId)).for("share", { skipLocked: true });
    if (!page) { await postpone(); return; }
    const [channel] = await tx.select().from(organizationChannel)
      .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, recipient.channel)))
      .for("share", { skipLocked: true });
    if (!channel) {
      const [exists] = await tx.select({ enabled: organizationChannel.enabled }).from(organizationChannel)
        .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, recipient.channel)));
      if (exists) { await postpone(); return; }
    }
    if (delivery.expiresAt <= new Date() || !page.published || !channel?.enabled || !["email", "webhook"].includes(recipient.channel)) {
      await discardTokens();
      const expired = delivery.expiresAt <= new Date();
      await tx.update(confirmationDelivery).set({ status: expired ? "failed" : "skipped", reason: expired ? "expired" : "unavailable", processedAt: sql`clock_timestamp()` })
        .where(eq(confirmationDelivery.id, delivery.id));
      return;
    }
    const attempts = delivery.attempts + 1;
    try {
      const brand = await getPageEmailBrand(tx, page.id, page.name);
      const [webhook] = recipient.channel === "webhook"
        ? await tx.select().from(webhookSubscription).where(eq(webhookSubscription.subscriptionId, recipient.id)) : [];
      if (recipient.channel === "webhook" && !webhook) throw new Error("Webhook subscription is missing");
      await sendSubscriptionConfirmation(webhook?.contactEmail ?? recipient.destination, page.name, tokenUrl("confirm", claim.confirm), tokenUrl("unsubscribe", claim.unsubscribe), tokenUrl("manage", claim.unsubscribe), brand, false,
        webhook ? recipient.destination : undefined, Boolean(recipient.confirmedAt));
    } catch (error) {
      const failure = describeFailure(error, "email");
      const failed = failure.permanent || attempts >= 8;
      const delaySeconds = Math.min(60 * 2 ** (attempts - 1), 3600);
      await tx.update(confirmationDelivery).set({ status: failed ? "failed" : "pending", reason: "delivery_failed", attempts,
        lastFailureCode: failure.code, lastResponseCode: failure.responseCode, lastFailureAt: sql`clock_timestamp()`,
        nextAttemptAt: sql`now() + ${delaySeconds} * interval '1 second'`, processedAt: failed ? sql`clock_timestamp()` : null,
      }).where(eq(confirmationDelivery.id, delivery.id));
      console.error(`Subscription confirmation ${delivery.id} failed${failed ? " permanently" : "; it will be retried"}`);
      return;
    }
    await tx.update(confirmationDelivery).set({ status: "sent", reason: null, attempts, processedAt: sql`clock_timestamp()` })
      .where(eq(confirmationDelivery.id, delivery.id));
  });
  return true;
}
