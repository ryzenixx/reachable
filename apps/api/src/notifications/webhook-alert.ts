import { randomBytes } from "node:crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery, webhookFailureAlert } from "../db/schema/notification";
import { statusPage } from "../db/schema/status-page";
import { subscription, subscriptionToken, webhookSubscription } from "../db/schema/subscription";
import { getPageEmailBrand } from "../branding/email";
import { hashToken, tokenUrl } from "../subscriptions/tokens";
import { sendWebhookFailureAlert } from "./email/messages";
import { describeFailure } from "./failures";
import { withLeaseRenewal } from "./lease";

export async function processWebhookFailureAlert() {
  const prepared = await db.transaction(async (tx) => {
    const [alert] = await tx
      .select()
      .from(webhookFailureAlert)
      .where(
        and(
          eq(webhookFailureAlert.status, "pending"),
          lte(webhookFailureAlert.nextAttemptAt, sql`now()`),
        ),
      )
      .orderBy(asc(webhookFailureAlert.nextAttemptAt), asc(webhookFailureAlert.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!alert) return false;
    const postpone = async (seconds: number) => {
      await tx
        .update(webhookFailureAlert)
        .set({ nextAttemptAt: sql`now() + ${seconds} * interval '1 second'` })
        .where(eq(webhookFailureAlert.id, alert.id));
    };
    const [recipient] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.id, alert.subscriptionId))
      .for("update", { skipLocked: true });
    if (!recipient) {
      await postpone(10);
      return true;
    }
    const [delivery] = await tx
      .select({ status: notificationDelivery.status })
      .from(notificationDelivery)
      .where(
        and(
          eq(notificationDelivery.id, alert.deliveryId),
          eq(notificationDelivery.subscriptionId, recipient.id),
        ),
      )
      .for("share", { skipLocked: true });
    if (!delivery) {
      await postpone(10);
      return true;
    }
    if (delivery.status === "pending") {
      await postpone(30);
      return true;
    }
    if (delivery.status !== "failed" || recipient.channel !== "webhook" || !recipient.confirmedAt) {
      await tx
        .update(webhookFailureAlert)
        .set({ status: "skipped", reason: "unavailable", processedAt: sql`clock_timestamp()` })
        .where(eq(webhookFailureAlert.id, alert.id));
      return true;
    }
    const [page] = await tx
      .select()
      .from(statusPage)
      .where(eq(statusPage.id, recipient.statusPageId))
      .for("share", { skipLocked: true });
    if (!page) {
      await postpone(10);
      return true;
    }
    const [webhook] = await tx
      .select()
      .from(webhookSubscription)
      .where(eq(webhookSubscription.subscriptionId, recipient.id));
    if (!webhook) {
      await tx
        .update(webhookFailureAlert)
        .set({ status: "skipped", reason: "unavailable", processedAt: sql`clock_timestamp()` })
        .where(eq(webhookFailureAlert.id, alert.id));
      return true;
    }
    const token = randomBytes(32).toString("base64url");
    await tx
      .insert(subscriptionToken)
      .values({ hash: hashToken(token), subscriptionId: recipient.id, purpose: "unsubscribe" });
    const brand = await getPageEmailBrand(tx, page.id, page.name);
    const [lease] = await tx
      .update(webhookFailureAlert)
      .set({
        nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'`,
      })
      .where(eq(webhookFailureAlert.id, alert.id))
      .returning({ until: webhookFailureAlert.nextAttemptAt });
    return { alert, recipient, page, webhook, token, brand, until: lease.until };
  });
  if (typeof prepared === "boolean") return prepared;
  const { alert, recipient, page, webhook, token, brand, until } = prepared;
  const attempts = alert.attempts + 1;
  const cycleAttempts = alert.cycleAttempts + 1;
  const { lease, outcome } = await withLeaseRenewal(
    until,
    async (previous) => {
      const [renewed] = await db
        .update(webhookFailureAlert)
        .set({
          nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'`,
        })
        .where(
          and(
            eq(webhookFailureAlert.id, alert.id),
            eq(webhookFailureAlert.status, "pending"),
            eq(webhookFailureAlert.nextAttemptAt, previous),
          ),
        )
        .returning({ until: webhookFailureAlert.nextAttemptAt });
      return renewed?.until;
    },
    () =>
      sendWebhookFailureAlert(
        webhook.contactEmail,
        page.name,
        new URL(recipient.destination).host,
        alert.failureCode,
        alert.responseCode,
        page.published ? tokenUrl("manage", token) : undefined,
        tokenUrl("unsubscribe", token),
        brand,
      ),
  );
  const currentLease = and(
    eq(webhookFailureAlert.id, alert.id),
    eq(webhookFailureAlert.status, "pending"),
    eq(webhookFailureAlert.nextAttemptAt, lease),
  );
  if (!outcome.success) {
    const failure = describeFailure(outcome.error, "email");
    const failed = failure.permanent || cycleAttempts >= 8;
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(webhookFailureAlert)
        .set({
          status: failed ? "failed" : "pending",
          attempts,
          cycleAttempts,
          reason: "delivery_failed",
          lastFailureCode: failure.code,
          lastResponseCode: failure.responseCode,
          nextAttemptAt: sql`now() + ${Math.min(60 * 2 ** (cycleAttempts - 1), 3600)} * interval '1 second'`,
          processedAt: failed ? sql`clock_timestamp()` : null,
        })
        .where(currentLease)
        .returning({ id: webhookFailureAlert.id });
      if (updated)
        await tx.delete(subscriptionToken).where(eq(subscriptionToken.hash, hashToken(token)));
    });
    console.error(
      `Webhook failure alert ${alert.id} failed${failed ? " permanently" : "; it will be retried"}`,
    );
    return true;
  }
  await db
    .update(webhookFailureAlert)
    .set({
      status: "sent",
      attempts,
      cycleAttempts,
      reason: null,
      processedAt: sql`clock_timestamp()`,
    })
    .where(currentLease);
  return true;
}
