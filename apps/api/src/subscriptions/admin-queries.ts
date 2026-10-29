import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { subscription, subscriptionComponent } from "../db/schema/subscription";
import { component } from "../db/schema/component";
import { encodeCursor, type HistoryQuery } from "../history/pagination";
import { recordPageActivity } from "../activity/record";
import { updatePreferences } from "./preferences";
import type { SubscriptionPreferences } from "./validation";

export type SubscriptionListQuery = HistoryQuery<"all" | "confirmed" | "pending"> & {
  channel?: string;
  search?: string;
};

export async function summarizeSubscriptions(pageId: string) {
  return db
    .select({
      channel: subscription.channel,
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${subscription.confirmedAt} is not null)::int`,
      pending: sql<number>`count(*) filter (where ${subscription.confirmedAt} is null)::int`,
    })
    .from(subscription)
    .where(eq(subscription.statusPageId, pageId))
    .groupBy(subscription.channel)
    .orderBy(subscription.channel);
}

export async function listSubscriptions(pageId: string, options: SubscriptionListQuery) {
  return db.transaction(
    async (tx) => {
      const conditions = [eq(subscription.statusPageId, pageId)];
      if (options.state === "confirmed") conditions.push(isNotNull(subscription.confirmedAt));
      if (options.state === "pending") conditions.push(isNull(subscription.confirmedAt));
      if (options.channel) conditions.push(eq(subscription.channel, options.channel));
      if (options.search)
        conditions.push(
          ilike(subscription.destination, `%${options.search.replace(/[\\%_]/g, "\\$&")}%`),
        );
      if (options.cursor)
        conditions.push(
          sql`(${subscription.createdAt}, ${subscription.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)`,
        );
      const rows = await tx
        .select({
          id: subscription.id,
          channel: subscription.channel,
          destination: subscription.destination,
          allComponents: subscription.allComponents,
          confirmedAt: subscription.confirmedAt,
          createdAt: subscription.createdAt,
          lastRequestedAt: subscription.lastRequestedAt,
          cursorTimestamp: sql<string>`to_char(${subscription.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        })
        .from(subscription)
        .where(and(...conditions))
        .orderBy(desc(subscription.createdAt), desc(subscription.id))
        .limit(options.limit + 1);
      const selected = rows.slice(0, options.limit);
      const last = selected.at(-1);
      const components = selected.length
        ? await tx
            .select({
              subscriptionId: subscriptionComponent.subscriptionId,
              id: component.id,
              name: component.name,
            })
            .from(subscriptionComponent)
            .innerJoin(component, eq(component.id, subscriptionComponent.componentId))
            .where(
              inArray(
                subscriptionComponent.subscriptionId,
                selected.map(({ id }) => id),
              ),
            )
            .orderBy(component.position, component.createdAt, component.id)
        : [];
      return {
        data: selected.map(({ cursorTimestamp: _, allComponents, ...item }) => ({
          ...item,
          state: item.confirmedAt ? ("confirmed" as const) : ("pending" as const),
          scope: allComponents ? ("all" as const) : ("selected" as const),
          components: components
            .filter((entry) => entry.subscriptionId === item.id)
            .map(({ subscriptionId: _, ...entry }) => entry),
        })),
        nextCursor:
          rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function updateSubscriptionPreferences(
  pageId: string,
  subscriptionId: string,
  input: SubscriptionPreferences,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(subscription)
      .where(and(eq(subscription.id, subscriptionId), eq(subscription.statusPageId, pageId)))
      .for("update");
    if (!current) return "not_found" as const;
    return updatePreferences(tx, current, input, { type: "member", id: actorId });
  });
}

export async function removeSubscription(pageId: string, subscriptionId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(subscription)
      .where(and(eq(subscription.id, subscriptionId), eq(subscription.statusPageId, pageId)))
      .returning({ channel: subscription.channel });
    if (!deleted) return false;
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "subscription.removed",
      resourceType: "subscription",
      resourceId: subscriptionId,
      details: { channel: deleted.channel },
    });
    return true;
  });
}

export async function removeSubscriptions(pageId: string, ids: string[], actorId: string) {
  return db.transaction(async (tx) => {
    const locked = await tx
      .select({ id: subscription.id })
      .from(subscription)
      .where(and(eq(subscription.statusPageId, pageId), inArray(subscription.id, ids)))
      .orderBy(subscription.id)
      .for("update");
    if (!locked.length) return [];
    const removed = await tx
      .delete(subscription)
      .where(
        and(
          eq(subscription.statusPageId, pageId),
          inArray(
            subscription.id,
            locked.map(({ id }) => id),
          ),
        ),
      )
      .returning({ id: subscription.id, channel: subscription.channel });
    for (const entry of removed)
      await recordPageActivity(tx, pageId, {
        actor: { type: "member", id: actorId },
        action: "subscription.removed",
        resourceType: "subscription",
        resourceId: entry.id,
        details: { channel: entry.channel },
      });
    return removed.map(({ id }) => id);
  });
}

export async function getSubscription(pageId: string, subscriptionId: string) {
  return db.transaction(
    async (tx) => {
      const [entry] = await tx
        .select({
          id: subscription.id,
          channel: subscription.channel,
          destination: subscription.destination,
          allComponents: subscription.allComponents,
          confirmedAt: subscription.confirmedAt,
          createdAt: subscription.createdAt,
          lastRequestedAt: subscription.lastRequestedAt,
        })
        .from(subscription)
        .where(and(eq(subscription.id, subscriptionId), eq(subscription.statusPageId, pageId)));
      if (!entry) return undefined;
      const components = await tx
        .select({ id: component.id, name: component.name })
        .from(subscriptionComponent)
        .innerJoin(component, eq(component.id, subscriptionComponent.componentId))
        .where(eq(subscriptionComponent.subscriptionId, subscriptionId))
        .orderBy(component.position, component.createdAt, component.id);
      const { allComponents, ...item } = entry;
      return {
        ...item,
        state: item.confirmedAt ? ("confirmed" as const) : ("pending" as const),
        scope: allComponents ? ("all" as const) : ("selected" as const),
        components,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
