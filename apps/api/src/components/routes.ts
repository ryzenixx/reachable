import { Hono } from "hono";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { createComponent, deleteComponent, listComponents, updateComponent } from "./queries";
import { componentIdSchema, createComponentSchema, updateComponentSchema } from "./validation";
import { getComponentHistory, listComponentStateChanges, parseHistoryRange } from "./history";
import { parseHistoryQuery } from "../history/pagination";

type ComponentContext = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };

export const componentRoutes = new Hono<ComponentContext>();

componentRoutes.use("*", requireOrganization);
componentRoutes.use("*", async (c, next) => {
  const pageId = componentIdSchema.safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) {
    return c.json({ error: "Not found" }, 404);
  }
  c.set("statusPageId", pageId.data);
  await next();
});

componentRoutes.get("/", async (c) => c.json(await listComponents(c.get("statusPageId"))));

componentRoutes.get("/:componentId/history", async (c) => {
  const id = componentIdSchema.safeParse(c.req.param("componentId"));
  if (!id.success) return c.json({ error: "Invalid component ID" }, 400);
  const url = new URL(c.req.url);
  const range = parseHistoryRange(url);
  if (!range || [...url.searchParams].length) return c.json({ error: "Invalid history range" }, 400);
  c.header("Cache-Control", "no-store");
  const history = await getComponentHistory(c.get("statusPageId"), id.data, range);
  if (!history) return c.json({ error: "Not found" }, 404);
  return c.json(history);
});

componentRoutes.get("/:componentId/history/changes", async (c) => {
  const id = componentIdSchema.safeParse(c.req.param("componentId"));
  if (!id.success) return c.json({ error: "Invalid component ID" }, 400);
  const url = new URL(c.req.url);
  const range = parseHistoryRange(url);
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!range || !options) return c.json({ error: "Invalid query parameters" }, 400);
  c.header("Cache-Control", "no-store");
  const history = await listComponentStateChanges(c.get("statusPageId"), id.data, range, options.limit, options.cursor);
  if (!history) return c.json({ error: "Not found" }, 404);
  return c.json({ from: range.from, to: range.to, ...history });
});

componentRoutes.post("/", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = createComponentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createComponent(c.get("statusPageId"), parsed.data, c.get("userId"));
  if (created === "invalid_group") return c.json({ error: "Invalid component group" }, 400);
  return c.json(created, 201);
});

componentRoutes.patch("/:componentId", requireOrganizationAdmin, async (c) => {
  const componentId = componentIdSchema.safeParse(c.req.param("componentId"));
  if (!componentId.success) return c.json({ error: "Invalid component ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = updateComponentSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await updateComponent(c.get("statusPageId"), componentId.data, parsed.data, c.get("userId"));
  if (!updated) return c.json({ error: "Not found" }, 404);
  if (updated === "invalid_group") return c.json({ error: "Invalid component group" }, 400);
  return c.json(updated);
});

componentRoutes.delete("/:componentId", requireOrganizationAdmin, async (c) => {
  const componentId = componentIdSchema.safeParse(c.req.param("componentId"));
  if (!componentId.success) return c.json({ error: "Invalid component ID" }, 400);
  const result = await deleteComponent(c.get("statusPageId"), componentId.data, c.get("userId"));
  if (result === "not_found") return c.json({ error: "Not found" }, 404);
  if (result === "in_use") return c.json({ error: "Component is linked to an incident or maintenance" }, 409);
  return c.body(null, 204);
});
