import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { activity } from "../db/schema/activity";
import { encodeCursor, parseHistoryQuery } from "../history/pagination";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";

export const activityRoutes = new Hono<OrganizationContext>();
activityRoutes.use("*", requireOrganization);
activityRoutes.use("*", requireOrganizationAdmin);
activityRoutes.get("/", async (c) => {
  c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url);
  if (url.searchParams.getAll("statusPageId").length > 1) return c.json({ error: "Invalid query parameters" }, 400);
  const pageId = url.searchParams.get("statusPageId");
  url.searchParams.delete("statusPageId");
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!options || (pageId !== null && !z.uuid().safeParse(pageId).success)) return c.json({ error: "Invalid query parameters" }, 400);
  if (pageId && !await pageBelongsToOrganization(pageId, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  const rows = await db.select({
    id: activity.id, statusPageId: activity.statusPageId, actorType: activity.actorType, actorId: activity.actorId,
    action: activity.action, resourceType: activity.resourceType, resourceId: activity.resourceId,
    details: activity.details, createdAt: activity.createdAt,
    cursorTimestamp: sql<string>`to_char(${activity.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
  }).from(activity).where(and(eq(activity.organizationId, c.get("organizationId")),
    pageId ? eq(activity.statusPageId, pageId) : undefined,
    options.cursor ? sql`(${activity.createdAt}, ${activity.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)` : undefined,
  )).orderBy(desc(activity.createdAt), desc(activity.id)).limit(options.limit + 1);
  const selected = rows.slice(0, options.limit);
  const last = selected.at(-1);
  return c.json({ data: selected.map(({ cursorTimestamp: _, ...item }) => item),
    nextCursor: rows.length > options.limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null });
});
