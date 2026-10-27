import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { deliveryStatus, notificationDelivery } from "../db/schema/notification";
import { subscription } from "../db/schema/subscription";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";

export const notificationRoutes = new Hono<OrganizationContext>();
notificationRoutes.use("*", requireOrganization);
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
