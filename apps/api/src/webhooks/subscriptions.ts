import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import {
  organizationChannel,
  subscription,
  subscriptionRateLimit,
  subscriptionToken,
  webhookSubscription,
} from "../db/schema/subscription";
import { confirmationDelivery } from "../db/schema/notification";
import { recordPageActivity } from "../activity/record";
import { updatePreferences } from "../subscriptions/preferences";
import type { SubscriptionPreferences } from "../subscriptions/validation";
import { newWebhookSecret } from "./secrets";
import { hashToken } from "../subscriptions/tokens";

export async function requestWebhookSubscription(
  slug: string,
  destination: string,
  email: string,
  preferences?: SubscriptionPreferences,
) {
  return db.transaction(async (tx) => {
    const [page] = await tx
      .select()
      .from(statusPage)
      .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)))
      .for("update");
    if (!page) return "not_found" as const;
    const [channel] = await tx
      .select()
      .from(organizationChannel)
      .where(
        and(
          eq(organizationChannel.organizationId, page.organizationId),
          eq(organizationChannel.channel, "webhook"),
        ),
      )
      .for("share");
    if (!channel?.enabled) return "unavailable" as const;
    const [existing] = await tx
      .select({
        id: subscription.id,
        confirmedAt: subscription.confirmedAt,
        recent: sql<boolean>`${subscription.lastRequestedAt} > now() - interval '5 minutes'`,
        contactEmail: webhookSubscription.contactEmail,
      })
      .from(subscription)
      .innerJoin(webhookSubscription, eq(webhookSubscription.subscriptionId, subscription.id))
      .where(
        and(
          eq(subscription.statusPageId, page.id),
          eq(subscription.channel, "webhook"),
          eq(subscription.destination, destination),
        ),
      )
      .for("update");
    if (existing && (existing.recent || existing.contactEmail !== email))
      return "accepted" as const;
    const [limit] = await tx
      .select({
        count: subscriptionRateLimit.count,
        inWindow: sql<boolean>`${subscriptionRateLimit.windowStartedAt} > now() - interval '1 minute'`,
      })
      .from(subscriptionRateLimit)
      .where(eq(subscriptionRateLimit.statusPageId, page.id));
    if (limit?.inWindow && limit.count >= 30) return "accepted" as const;
    const id = existing?.id ?? crypto.randomUUID();
    if (!existing) {
      const [entry] = await tx
        .insert(subscription)
        .values({ id, statusPageId: page.id, channel: "webhook", destination })
        .returning();
      await tx.insert(webhookSubscription).values({
        subscriptionId: id,
        contactEmail: email,
        encryptedSecret: newWebhookSecret(id).encrypted,
      });
      if (
        preferences &&
        (await updatePreferences(tx, entry, preferences, { type: "subscriber" })) ===
          "invalid_components"
      ) {
        await tx.delete(subscription).where(eq(subscription.id, id));
        return "invalid_components" as const;
      }
      await recordPageActivity(tx, page.id, {
        actor: { type: "subscriber" },
        action: "subscription.requested",
        resourceType: "subscription",
        resourceId: id,
        details: { channel: "webhook" },
      });
    } else {
      await tx
        .update(subscription)
        .set({ lastRequestedAt: sql`now()` })
        .where(eq(subscription.id, id));
    }
    await tx
      .insert(subscriptionRateLimit)
      .values({ statusPageId: page.id, count: 1, windowStartedAt: sql`now()` })
      .onConflictDoUpdate({
        target: subscriptionRateLimit.statusPageId,
        set: {
          count: limit?.inWindow ? limit.count + 1 : 1,
          windowStartedAt: limit?.inWindow
            ? sql`${subscriptionRateLimit.windowStartedAt}`
            : sql`now()`,
        },
      });
    await tx
      .update(confirmationDelivery)
      .set({ status: "skipped", reason: "superseded", processedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(confirmationDelivery.subscriptionId, id),
          eq(confirmationDelivery.status, "pending"),
        ),
      );
    await tx
      .delete(subscriptionToken)
      .where(
        and(eq(subscriptionToken.subscriptionId, id), eq(subscriptionToken.purpose, "confirm")),
      );
    await tx.insert(confirmationDelivery).values({ subscriptionId: id });
    return "accepted" as const;
  });
}

export async function rotateWebhookSecret(token: string) {
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select({ id: subscription.id })
      .from(subscriptionToken)
      .innerJoin(subscription, eq(subscription.id, subscriptionToken.subscriptionId))
      .where(
        and(
          eq(subscriptionToken.hash, hashToken(token)),
          eq(subscriptionToken.purpose, "unsubscribe"),
          eq(subscription.channel, "webhook"),
        ),
      );
    if (!found) return undefined;
    const [current] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.id, found.id))
      .for("update");
    if (!current?.confirmedAt) return undefined;
    const [valid] = await tx
      .select({ hash: subscriptionToken.hash })
      .from(subscriptionToken)
      .where(
        and(
          eq(subscriptionToken.hash, hashToken(token)),
          eq(subscriptionToken.subscriptionId, current.id),
          eq(subscriptionToken.purpose, "unsubscribe"),
        ),
      );
    if (!valid) return undefined;
    const [page] = await tx
      .select({ id: statusPage.id })
      .from(statusPage)
      .where(and(eq(statusPage.id, current.statusPageId), eq(statusPage.published, true)));
    if (!page) return undefined;
    const secret = newWebhookSecret(current.id);
    const [updated] = await tx
      .update(webhookSubscription)
      .set({ encryptedSecret: secret.encrypted })
      .where(eq(webhookSubscription.subscriptionId, current.id))
      .returning({ id: webhookSubscription.subscriptionId });
    if (!updated) return undefined;
    await recordPageActivity(tx, current.statusPageId, {
      actor: { type: "subscriber" },
      action: "webhook.secret_rotated",
      resourceType: "subscription",
      resourceId: current.id,
    });
    return secret.secret;
  });
}

export async function resendWebhookConfirmation(
  pageId: string,
  subscriptionId: string,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [page] = await tx
      .select()
      .from(statusPage)
      .where(eq(statusPage.id, pageId))
      .for("update");
    if (!page) return "not_found" as const;
    const [channel] = await tx
      .select()
      .from(organizationChannel)
      .where(
        and(
          eq(organizationChannel.organizationId, page.organizationId),
          eq(organizationChannel.channel, "webhook"),
        ),
      )
      .for("share");
    if (!page.published || !channel?.enabled) return "unavailable" as const;
    const [current] = await tx
      .select({
        id: subscription.id,
        confirmedAt: subscription.confirmedAt,
        recent: sql<boolean>`${subscription.lastRequestedAt} > now() - interval '5 minutes'`,
      })
      .from(subscription)
      .innerJoin(webhookSubscription, eq(webhookSubscription.subscriptionId, subscription.id))
      .where(
        and(
          eq(subscription.id, subscriptionId),
          eq(subscription.statusPageId, pageId),
          eq(subscription.channel, "webhook"),
        ),
      )
      .for("update");
    if (!current) return "not_found" as const;
    if (current.confirmedAt) return "already_confirmed" as const;
    if (current.recent) return "cooldown" as const;
    const [limit] = await tx
      .select({
        count: subscriptionRateLimit.count,
        inWindow: sql<boolean>`${subscriptionRateLimit.windowStartedAt} > now() - interval '1 minute'`,
      })
      .from(subscriptionRateLimit)
      .where(eq(subscriptionRateLimit.statusPageId, pageId));
    if (limit?.inWindow && limit.count >= 30) return "rate_limited" as const;
    await tx
      .update(subscription)
      .set({ lastRequestedAt: sql`now()` })
      .where(eq(subscription.id, subscriptionId));
    await tx
      .insert(subscriptionRateLimit)
      .values({ statusPageId: pageId, count: 1, windowStartedAt: sql`now()` })
      .onConflictDoUpdate({
        target: subscriptionRateLimit.statusPageId,
        set: {
          count: limit?.inWindow ? limit.count + 1 : 1,
          windowStartedAt: limit?.inWindow
            ? sql`${subscriptionRateLimit.windowStartedAt}`
            : sql`now()`,
        },
      });
    await tx
      .update(confirmationDelivery)
      .set({ status: "skipped", reason: "superseded", processedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(confirmationDelivery.subscriptionId, subscriptionId),
          eq(confirmationDelivery.status, "pending"),
        ),
      );
    await tx
      .delete(subscriptionToken)
      .where(
        and(
          eq(subscriptionToken.subscriptionId, subscriptionId),
          eq(subscriptionToken.purpose, "confirm"),
        ),
      );
    await tx.insert(confirmationDelivery).values({ subscriptionId });
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "subscription.confirmation_resent",
      resourceType: "subscription",
      resourceId: subscriptionId,
      details: { channel: "webhook" },
    });
    return "queued" as const;
  });
}
