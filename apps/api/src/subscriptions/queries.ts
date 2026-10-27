import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription, subscriptionRateLimit, subscriptionToken } from "../db/schema/subscription";
import { sendSubscriptionConfirmation } from "../notifications/email/messages";
import { hashToken, tokenUrl } from "./tokens";

export async function getPublicChannels(slug: string) {
  const [page] = await db.select({ organizationId: statusPage.organizationId }).from(statusPage)
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)));
  if (!page) return undefined;
  const [email] = await db.select({ enabled: organizationChannel.enabled }).from(organizationChannel)
    .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, "email")));
  return email?.enabled ? ["email"] : [];
}

export async function requestEmailSubscription(slug: string, email: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select().from(statusPage)
      .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true))).for("update");
    if (!page) return "not_found" as const;
    const [channel] = await tx.select().from(organizationChannel)
      .where(and(eq(organizationChannel.organizationId, page.organizationId), eq(organizationChannel.channel, "email")))
      .for("share");
    if (!channel?.enabled) return "unavailable" as const;
    const [limit] = await tx.select({
      count: subscriptionRateLimit.count,
      inWindow: sql<boolean>`${subscriptionRateLimit.windowStartedAt} > now() - interval '1 minute'`,
    }).from(subscriptionRateLimit).where(eq(subscriptionRateLimit.statusPageId, page.id));
    if (limit?.inWindow && limit.count >= 30) return "accepted" as const;
    const [existing] = await tx.select({
      id: subscription.id,
      recent: sql<boolean>`${subscription.lastRequestedAt} > now() - interval '5 minutes'`,
    }).from(subscription).where(and(eq(subscription.statusPageId, page.id), eq(subscription.channel, "email"), eq(subscription.destination, email)));
    if (existing?.recent) return "accepted" as const;
    const [entry] = await tx.insert(subscription).values({ statusPageId: page.id, channel: "email", destination: email })
      .onConflictDoUpdate({ target: [subscription.statusPageId, subscription.channel, subscription.destination],
        set: { lastRequestedAt: sql`now()` } }).returning({ id: subscription.id });
    await tx.insert(subscriptionRateLimit).values({ statusPageId: page.id, count: 1, windowStartedAt: sql`now()` })
      .onConflictDoUpdate({ target: subscriptionRateLimit.statusPageId, set: {
        count: limit?.inWindow ? limit.count + 1 : 1,
        windowStartedAt: limit?.inWindow ? sql`${subscriptionRateLimit.windowStartedAt}` : sql`now()`,
      } });
    await tx.delete(subscriptionToken).where(and(eq(subscriptionToken.subscriptionId, entry.id), eq(subscriptionToken.purpose, "confirm")));
    const confirm = randomBytes(32).toString("base64url");
    const unsubscribe = randomBytes(32).toString("base64url");
    await tx.insert(subscriptionToken).values([
      { hash: hashToken(confirm), subscriptionId: entry.id, purpose: "confirm", expiresAt: sql`now() + interval '24 hours'` },
      { hash: hashToken(unsubscribe), subscriptionId: entry.id, purpose: "unsubscribe" },
    ]);
    await sendSubscriptionConfirmation(email, page.name, tokenUrl("confirm", confirm), tokenUrl("unsubscribe", unsubscribe));
    return "accepted" as const;
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
      return true;
    }
    const [enabled] = await tx.select({ id: statusPage.id }).from(statusPage)
      .innerJoin(organizationChannel, and(eq(organizationChannel.organizationId, statusPage.organizationId),
        eq(organizationChannel.channel, locked.channel), eq(organizationChannel.enabled, true)))
      .where(and(eq(statusPage.id, locked.statusPageId), eq(statusPage.published, true)));
    if (!enabled) return false;
    await tx.update(subscription).set({ confirmedAt: sql`coalesce(${subscription.confirmedAt}, now())` }).where(eq(subscription.id, locked.id));
    await tx.delete(subscriptionToken).where(and(eq(subscriptionToken.subscriptionId, locked.id), eq(subscriptionToken.purpose, "confirm")));
    return true;
  });
}
