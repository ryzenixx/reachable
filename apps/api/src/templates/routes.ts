import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { parseHistoryQuery } from "../history/pagination";
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from "./queries";
import { templateKinds, templateSchema } from "./validation";
import { createTemplateDoc, deleteTemplateDoc, getTemplateDoc, listTemplatesDoc, updateTemplateDoc } from "./openapi";

type Context = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };
export const templateRoutes = new Hono<Context>();
templateRoutes.use("*", requireOrganization);
templateRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  c.set("statusPageId", pageId.data);
  await next();
});

templateRoutes.get("/", listTemplatesDoc, async (c) => {
  const url = new URL(c.req.url);
  if (url.searchParams.getAll("kind").length > 1) return c.json({ error: "Invalid query parameters" }, 400);
  const kind = z.enum(templateKinds).optional().safeParse(url.searchParams.get("kind") ?? undefined);
  url.searchParams.delete("kind");
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!kind.success || !options) return c.json({ error: "Invalid query parameters" }, 400);
  return c.json(await listTemplates(c.get("statusPageId"), { ...options, kind: kind.data }));
});

templateRoutes.get("/:templateId", getTemplateDoc, async (c) => {
  const id = z.uuid().safeParse(c.req.param("templateId"));
  if (!id.success) return c.json({ error: "Invalid template ID" }, 400);
  const template = await getTemplate(c.get("statusPageId"), id.data);
  if (!template) return c.json({ error: "Not found" }, 404);
  return c.json(template);
});

templateRoutes.post("/", createTemplateDoc, requireOrganizationAdmin, bodyLimit({ maxSize: 65536 }), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = templateSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createTemplate(c.get("statusPageId"), input.data, c.get("userId"));
  if (created === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});

templateRoutes.put("/:templateId", updateTemplateDoc, requireOrganizationAdmin, bodyLimit({ maxSize: 65536 }), async (c) => {
  const id = z.uuid().safeParse(c.req.param("templateId"));
  if (!id.success) return c.json({ error: "Invalid template ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = templateSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await updateTemplate(c.get("statusPageId"), id.data, input.data, c.get("userId"));
  if (!updated) return c.json({ error: "Not found" }, 404);
  if (updated === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(updated);
});

templateRoutes.delete("/:templateId", deleteTemplateDoc, requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("templateId"));
  if (!id.success) return c.json({ error: "Invalid template ID" }, 400);
  if (!await deleteTemplate(c.get("statusPageId"), id.data, c.get("userId"))) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
