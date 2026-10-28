import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { organizationChannel } from "../db/schema/subscription";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { recordOrganizationActivity } from "../activity/record";

export const channelRoutes = new Hono<OrganizationContext>();
channelRoutes.use("*", requireOrganization);

channelRoutes.get("/", async (c) => {
  const [email] = await db.select({ enabled: organizationChannel.enabled }).from(organizationChannel)
    .where(and(eq(organizationChannel.organizationId, c.get("organizationId")), eq(organizationChannel.channel, "email")));
  return c.json({ email: { enabled: email?.enabled ?? false } });
});

channelRoutes.put("/email", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = z.strictObject({ enabled: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  await db.transaction(async (tx) => {
    const [changed] = await tx.insert(organizationChannel).values({ organizationId: c.get("organizationId"), channel: "email", enabled: input.data.enabled })
      .onConflictDoUpdate({ target: [organizationChannel.organizationId, organizationChannel.channel], set: { enabled: input.data.enabled },
        setWhere: sql`${organizationChannel.enabled} is distinct from ${input.data.enabled}` }).returning();
    if (changed) await recordOrganizationActivity(tx, c.get("organizationId"), { actor: { type: "member", id: c.get("userId") },
      action: "notification_channel.updated", resourceType: "notification_channel", resourceId: "email", details: { enabled: input.data.enabled } });
  });
  return c.json({ channel: "email", enabled: input.data.enabled });
});
