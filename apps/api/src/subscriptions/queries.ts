import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription, subscriptionRateLimit, subscriptionToken, webhookSubscription } from "../db/schema/subscription";
import { readWebhookSecret } from "../webhooks/secrets";
import { hashToken } from "./tokens";
import { confirmationDelivery } from "../db/schema/notification";
import { recordPageActivity, type Actor } from "../activity/record";
import { updatePreferences } from "./preferences";
import type { SubscriptionPreferences } from "./validation";

export async function getPublicChannels(slug: string) {
  const [page] = await db.select({ organizationId: statusPage.organizationId }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)));
  if (!page) return undefined;
  const channels = await db.select({ channel: organizationChannel.channel }).from(organizationChannel)
    .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.enabled, true)));
  return channels.map(({ channel }) => channel).filter((channel) => channel === "email" || channel === "webhook");
}

type SubscriptionRequest =
  | { type: "public"; slug: string; email: string; preferences?: SubscriptionPreferences }
  | { type: "admin"; pageId: string; email: string; actorId: string; preferences?: SubscriptionPreferences }
  | { type: "resend"; pageId: string; subscriptionId: string; actorId: string };

export async function requestEmailSubscription(input: SubscriptionRequest) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select().from(statusPage)
      .where(input.type === "public" ? and(eq(statusPage.slug, input.slug), eq(statusPage.published, true)) : eq(statusPage.id, input.pageId)).for("update");
    if (!page) return "not_found" as const;
    if (!page.published) return "unavailable" as const;
    const [channel] = await tx.select().from(organizationChannel)
      .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, "email"))).for("share");
    if (!channel?.enabled) return "unavailable" as const;
    const [existing] = await tx.select({
      id: subscription.id, destination: subscription.destination, confirmedAt: subscription.confirmedAt,
      recent: sql<boolean>`${subscription.lastRequestedAt} > now() - interval '5 minutes'`,
    }).from(subscription).where(and(eq(subscription.statusPageId, page.id), eq(subscription.channel, "email"),
      input.type === "resend" ? eq(subscription.id, input.subscriptionId) : eq(subscription.destination, input.email))).for("update");
    if (input.type === "resend" && !existing) return "not_found" as const;
    if (input.type !== "public" && existing?.confirmedAt) return "already_confirmed" as const;
    if (existing?.recent) return input.type === "public" ? "accepted" as const : "cooldown" as const;
    const [limit] = await tx.select({ count: subscriptionRateLimit.count,
      inWindow: sql<boolean>`${subscriptionRateLimit.windowStartedAt} > now() - interval '1 minute'`,
    }).from(subscriptionRateLimit).where(eq(subscriptionRateLimit.statusPageId, page.id));
    if (limit?.inWindow && limit.count >= 30) return input.type === "public" ? "accepted" as const : "rate_limited" as const;
    const email = input.type === "resend" ? existing!.destination : input.email;
    const [entry] = await tx.insert(subscription).values({ statusPageId: page.id, channel: "email", destination: email })
      .onConflictDoUpdate({ target: [subscription.statusPageId, subscription.channel, subscription.destination],
        set: { lastRequestedAt: sql`now()` } }).returning();
    if (!existing && input.type !== "resend" && input.preferences) {
      const actor: Actor = input.type === "admin" ? { type: "member", id: input.actorId } : { type: "subscriber" };
      const result = await updatePreferences(tx, entry, input.preferences, actor);
      if (result === "invalid_components") {
        await tx.delete(subscription).where(eq(subscription.id, entry.id));
        return result;
      }
    }
    await tx.insert(subscriptionRateLimit).values({ statusPageId: page.id, count: 1, windowStartedAt: sql`now()` })
      .onConflictDoUpdate({ target: subscriptionRateLimit.statusPageId, set: {
        count: limit?.inWindow ? limit.count + 1 : 1,
        windowStartedAt: limit?.inWindow ? sql`${subscriptionRateLimit.windowStartedAt}` : sql`now()`,
      } });
    await tx.update(confirmationDelivery).set({ status: "skipped", reason: "superseded", processedAt: sql`clock_timestamp()` })
      .where(and(eq(confirmationDelivery.subscriptionId, entry.id), eq(confirmationDelivery.status, "pending")));
    await tx.delete(subscriptionToken).where(and(eq(subscriptionToken.subscriptionId, entry.id), eq(subscriptionToken.purpose, "confirm")));
    await tx.insert(confirmationDelivery).values({ subscriptionId: entry.id });
    const actor: Actor = input.type === "public" ? { type: "subscriber" } : { type: "member", id: input.actorId };
    if (!existing || input.type !== "public") await recordPageActivity(tx, page.id, { actor,
      action: existing ? "subscription.confirmation_resent" : "subscription.requested",
      resourceType: "subscription", resourceId: entry.id, details: { channel: "email" } });
    return input.type === "public" ? "accepted" as const : "queued" as const;
  });
}

export async function useSubscriptionToken(token: string, purpose: "confirm" | "unsubscribe") {
  const hash = hashToken(token);
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ id: subscription.id }).from(subscriptionToken)
      .innerJoin(subscription, eq(subscription.id, subscriptionToken.subscriptionId))
      .where(and(eq(subscriptionToken.hash, hash), eq(subscriptionToken.purpose, purpose),
        or(isNull(subscriptionToken.expiresAt), gt(subscriptionToken.expiresAt, sql`now()`))));
    if (!found) return false;
    const [locked] = await tx.select().from(subscription).where(eq(subscription.id, found.id)).for("update");
    if (!locked) return false;
    const [valid] = await tx.select().from(subscriptionToken).where(and(eq(subscriptionToken.hash, hash), eq(subscriptionToken.purpose, purpose),
      or(isNull(subscriptionToken.expiresAt), gt(subscriptionToken.expiresAt, sql`now()`))));
    if (!valid) return false;
    if (purpose === "unsubscribe") {
      await tx.delete(subscription).where(eq(subscription.id, locked.id));
      await recordPageActivity(tx, locked.statusPageId, { actor: { type: "subscriber" }, action: "subscription.removed", resourceType: "subscription", resourceId: locked.id, details: { channel: locked.channel } });
      return true;
    }
    const [enabled] = await tx.select({ id: statusPage.id }).from(statusPage)
      .innerJoin(organizationChannel, and(eq(organizationChannel.organizationId, statusPage.organizationId),
        eq(organizationChannel.channel, locked.channel), eq(organizationChannel.enabled, true)))
      .where(and(eq(statusPage.id, locked.statusPageId), eq(statusPage.published, true)));
    if (!enabled) return false;
    await tx.update(subscription).set({ confirmedAt: sql`coalesce(${subscription.confirmedAt}, now())` }).where(eq(subscription.id, locked.id));
    await tx.update(confirmationDelivery).set({ status: "skipped", reason: "confirmed", processedAt: sql`clock_timestamp()` })
      .where(and(eq(confirmationDelivery.subscriptionId, locked.id), eq(confirmationDelivery.status, "pending")));
    await tx.delete(subscriptionToken).where(and(eq(subscriptionToken.subscriptionId, locked.id), eq(subscriptionToken.purpose, "confirm")));
    if (!locked.confirmedAt) await recordPageActivity(tx, locked.statusPageId, { actor: { type: "subscriber" }, action: "subscription.confirmed", resourceType: "subscription", resourceId: locked.id, details: { channel: locked.channel } });
    if (locked.channel === "webhook" && !locked.confirmedAt) {
      const [webhook] = await tx.select().from(webhookSubscription).where(eq(webhookSubscription.subscriptionId, locked.id));
      if (!webhook) throw new Error("Webhook subscription is missing");
      return readWebhookSecret(webhook.encryptedSecret, locked.id);
    }
    return true;
  });
}
