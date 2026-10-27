import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { auth } from "../auth";
import { db } from "../db";
import { member } from "../db/schema/auth";

export type OrganizationContext = {
  Variables: { organizationId: string; membershipRole: string; userId: string };
};

export const requireOrganization = createMiddleware<OrganizationContext>(async (c, next) => {
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
  c.set("organizationId", organizationId);
  c.set("membershipRole", membership.role);
  c.set("userId", session.user.id);
  await next();
});

export const requireOrganizationAdmin = createMiddleware<OrganizationContext>(async (c, next) => {
  const roles = c.get("membershipRole").split(",");
  if (!roles.some((role) => role === "owner" || role === "admin")) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});
