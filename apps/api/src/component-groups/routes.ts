import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { z } from "zod";
import {
  requireOrganization,
  requireOrganizationAdmin,
  requireStatusPage,
  type StatusPageContext,
} from "../organizations/access";
import { createGroup, deleteGroup, listGroups, updateGroup } from "./queries";
import { createGroupSchema, updateGroupSchema } from "./validation";
import { createGroupDoc, deleteGroupDoc, listGroupsDoc, updateGroupDoc } from "./openapi";

export const componentGroupRoutes = new Hono<StatusPageContext>();
componentGroupRoutes.use("*", requireOrganization);
componentGroupRoutes.use("*", requireStatusPage);
componentGroupRoutes.get("/", listGroupsDoc, async (c) =>
  c.json(await listGroups(c.get("statusPageId"))),
);
componentGroupRoutes.post("/", createGroupDoc, requireOrganizationAdmin, async (c) => {
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const parsed = createGroupSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  return c.json(await createGroup(c.get("statusPageId"), parsed.data, c.get("userId")), 201);
});
componentGroupRoutes.patch("/:groupId", updateGroupDoc, requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("groupId"));
  if (!id.success) return c.json({ error: "Invalid group ID" }, 400);
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const parsed = updateGroupSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const group = await updateGroup(c.get("statusPageId"), id.data, parsed.data, c.get("userId"));
  if (!group) return c.json({ error: "Not found" }, 404);
  return c.json(group);
});
componentGroupRoutes.delete("/:groupId", deleteGroupDoc, requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("groupId"));
  if (!id.success) return c.json({ error: "Invalid group ID" }, 400);
  if (!(await deleteGroup(c.get("statusPageId"), id.data, c.get("userId"))))
    return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
