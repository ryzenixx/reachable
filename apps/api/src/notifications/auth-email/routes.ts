import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { authEmailDelivery } from "../../db/schema/auth-email-delivery";
import { deliveryStatus } from "../../db/schema/notification";
import { encodeCursor, parseHistoryQuery } from "../../history/pagination";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../../organizations/access";
import { listInvitationDeliveriesDoc } from "../../activity/openapi";

export const authEmailRoutes = new Hono<OrganizationContext>();
authEmailRoutes.use("*", requireOrganization);
authEmailRoutes.use("*", requireOrganizationAdmin);
authEmailRoutes.get("/", listInvitationDeliveriesDoc, async (c) => {
  c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url);
  if (url.searchParams.getAll("status").length > 1)
    return c.json({ error: "Invalid query parameters" }, 400);
  const status = z
    .enum(deliveryStatus.enumValues)
    .optional()
    .safeParse(url.searchParams.get("status") ?? undefined);
  url.searchParams.delete("status");
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!status.success || !options) return c.json({ error: "Invalid query parameters" }, 400);
  const rows = await db
    .select({
      id: authEmailDelivery.id,
      invitationId: authEmailDelivery.subjectId,
      status: authEmailDelivery.status,
      reason: authEmailDelivery.reason,
      attempts: authEmailDelivery.attempts,
      nextAttemptAt: authEmailDelivery.nextAttemptAt,
      expiresAt: authEmailDelivery.expiresAt,
      createdAt: authEmailDelivery.createdAt,
      processedAt: authEmailDelivery.processedAt,
      cursorTimestamp: sql<string>`to_char(${authEmailDelivery.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(authEmailDelivery)
    .where(
      and(
        eq(authEmailDelivery.organizationId, c.get("organizationId")),
        eq(authEmailDelivery.kind, "invitation"),
        status.data ? eq(authEmailDelivery.status, status.data) : undefined,
        options.cursor
          ? sql`(${authEmailDelivery.createdAt}, ${authEmailDelivery.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(authEmailDelivery.createdAt), desc(authEmailDelivery.id))
    .limit(options.limit + 1);
  const selected = rows.slice(0, options.limit);
  const last = selected.at(-1);
  return c.json({
    data: selected.map(({ cursorTimestamp: _, ...row }) => row),
    nextCursor:
      rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null,
  });
});
