import { Hono } from "hono";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { createGroup, deleteGroup, listGroups, updateGroup } from "./queries";
import { createGroupSchema, updateGroupSchema } from "./validation";

type GroupContext = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };
export const componentGroupRoutes = new Hono<GroupContext>();
componentGroupRoutes.use("*", requireOrganization);
componentGroupRoutes.use("*", async (c, next) => {
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  c.set("statusPageId", pageId.data);
  await next();
});
componentGroupRoutes.get("/", async (c) => c.json(await listGroups(c.get("statusPageId"))));
componentGroupRoutes.post("/", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = createGroupSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  return c.json(await createGroup(c.get("statusPageId"), parsed.data), 201);
});
componentGroupRoutes.patch("/:groupId", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("groupId"));
  if (!id.success) return c.json({ error: "Invalid group ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = updateGroupSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const group = await updateGroup(c.get("statusPageId"), id.data, parsed.data);
  if (!group) return c.json({ error: "Not found" }, 404);
  return c.json(group);
});
componentGroupRoutes.delete("/:groupId", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("groupId"));
  if (!id.success) return c.json({ error: "Invalid group ID" }, 400);
  if (!await deleteGroup(c.get("statusPageId"), id.data)) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
