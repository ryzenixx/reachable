import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { confirmationDelivery, deliveryStatus, notificationDelivery } from "../db/schema/notification";
import { subscription } from "../db/schema/subscription";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { encodeCursor, parseHistoryQuery } from "../history/pagination";

export const notificationRoutes = new Hono<OrganizationContext>();
notificationRoutes.use("*", requireOrganization);
notificationRoutes.get("/confirmations", requireOrganizationAdmin, async (c) => {
  c.header("Cache-Control", "no-store");
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  const url = new URL(c.req.url);
  if (url.searchParams.getAll("status").length > 1) return c.json({ error: "Invalid query parameters" }, 400);
  const status = z.enum(deliveryStatus.enumValues).optional().safeParse(url.searchParams.get("status") ?? undefined);
  url.searchParams.delete("status");
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!status.success || !options) return c.json({ error: "Invalid query parameters" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  const rows = await db.select({ id: confirmationDelivery.id, subscriptionId: confirmationDelivery.subscriptionId,
    status: confirmationDelivery.status, reason: confirmationDelivery.reason, attempts: confirmationDelivery.attempts,
    nextAttemptAt: confirmationDelivery.nextAttemptAt, expiresAt: confirmationDelivery.expiresAt,
    createdAt: confirmationDelivery.createdAt, processedAt: confirmationDelivery.processedAt,
    channel: subscription.channel, destination: subscription.destination,
    cursorTimestamp: sql<string>`to_char(${confirmationDelivery.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(confirmationDelivery).innerJoin(subscription, eq(subscription.id, confirmationDelivery.subscriptionId))
    .where(and(eq(subscription.statusPageId, pageId.data), status.data ? eq(confirmationDelivery.status, status.data) : undefined,
      options.cursor ? sql`(${confirmationDelivery.createdAt}, ${confirmationDelivery.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)` : undefined))
    .orderBy(desc(confirmationDelivery.createdAt), desc(confirmationDelivery.id)).limit(options.limit + 1);
  const selected = rows.slice(0, options.limit);
  const last = selected.at(-1);
  return c.json({ data: selected.map(({ cursorTimestamp: _, ...item }) => item),
    nextCursor: rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null });
});
notificationRoutes.get("/", requireOrganizationAdmin, async (c) => {
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  const status = z.enum(deliveryStatus.enumValues).optional().safeParse(c.req.query("status"));
  if (!status.success) return c.json({ error: "Invalid status" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  const deliveries = await db.select({
    id: notificationDelivery.id, eventId: notificationDelivery.eventId, status: notificationDelivery.status,
    attempts: notificationDelivery.attempts, nextAttemptAt: notificationDelivery.nextAttemptAt,
    createdAt: notificationDelivery.createdAt, processedAt: notificationDelivery.processedAt,
    channel: subscription.channel, destination: subscription.destination,
  }).from(notificationDelivery).innerJoin(subscription, eq(subscription.id, notificationDelivery.subscriptionId))
    .where(and(eq(subscription.statusPageId, pageId.data), status.data ? eq(notificationDelivery.status, status.data) : undefined))
    .orderBy(desc(notificationDelivery.createdAt), desc(notificationDelivery.id)).limit(100);
  return c.json(deliveries);
});
