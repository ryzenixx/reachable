import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../auth";
import { db } from "../db";
import { member } from "../db/schema/auth";
import { statusPage } from "../db/schema/status-page";

const createStatusPage = z.strictObject({
  name: z.string().trim().min(1).max(100),
  slug: z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const statusPageRoutes = new Hono<{
  Variables: { membershipRole: string; organizationId: string };
}>();

statusPageRoutes.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const organizationId = c.req.param("organizationId");
  if (!organizationId) return c.json({ error: "Organization required" }, 400);

  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)))
    .limit(1);

  if (!membership) return c.json({ error: "Forbidden" }, 403);
  c.set("membershipRole", membership.role);
  c.set("organizationId", organizationId);
  await next();
});

statusPageRoutes.get("/", async (c) => {
  const pages = await db.select().from(statusPage)
    .where(eq(statusPage.organizationId, c.get("organizationId")))
    .orderBy(statusPage.createdAt, statusPage.id);
  return c.json(pages);
});

statusPageRoutes.post("/", async (c) => {
  if (!c.get("membershipRole").split(",").some((role: string) => role === "owner" || role === "admin")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const parsed = createStatusPage.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const [page] = await db.insert(statusPage).values({
    ...parsed.data,
    organizationId: c.get("organizationId"),
  }).onConflictDoNothing({ target: statusPage.slug }).returning();

  if (!page) return c.json({ error: "Slug already in use" }, 409);
  return c.json(page, 201);
});
