import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
  requireOrganization,
  requireOrganizationAdmin,
  requireStatusPage,
  type StatusPageContext,
} from "../organizations/access";
import { parseHistoryQuery } from "../history/pagination";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from "./queries";
import { templateKinds, templateSchema } from "./validation";
import {
  createTemplateDoc,
  deleteTemplateDoc,
  getTemplateDoc,
  listTemplatesDoc,
  updateTemplateDoc,
} from "./openapi";

export const templateRoutes = new Hono<StatusPageContext>();
templateRoutes.use("*", requireOrganization);
templateRoutes.use("*", requireStatusPage);

templateRoutes.get("/", listTemplatesDoc, async (c) => {
  const url = new URL(c.req.url);
  if (url.searchParams.getAll("kind").length > 1)
    return c.json({ error: "Invalid query parameters" }, 400);
  const kind = z
    .enum(templateKinds)
    .optional()
    .safeParse(url.searchParams.get("kind") ?? undefined);
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

templateRoutes.post(
  "/",
  createTemplateDoc,
  requireOrganizationAdmin,
  bodyLimit({ maxSize: 65536 }),
  async (c) => {
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const input = templateSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: "Invalid input" }, 400);
    const created = await createTemplate(c.get("statusPageId"), input.data, c.get("userId"));
    if (created === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json(created, 201);
  },
);

templateRoutes.put(
  "/:templateId",
  updateTemplateDoc,
  requireOrganizationAdmin,
  bodyLimit({ maxSize: 65536 }),
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("templateId"));
    if (!id.success) return c.json({ error: "Invalid template ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const input = templateSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: "Invalid input" }, 400);
    const updated = await updateTemplate(
      c.get("statusPageId"),
      id.data,
      input.data,
      c.get("userId"),
    );
    if (!updated) return c.json({ error: "Not found" }, 404);
    if (updated === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json(updated);
  },
);

templateRoutes.delete("/:templateId", deleteTemplateDoc, requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("templateId"));
  if (!id.success) return c.json({ error: "Invalid template ID" }, 400);
  if (!(await deleteTemplate(c.get("statusPageId"), id.data, c.get("userId"))))
    return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
