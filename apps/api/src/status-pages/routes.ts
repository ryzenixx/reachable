import { Hono } from "hono";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../organizations/access";
import { createStatusPage, listStatusPages, setStatusPagePublication } from "./queries";
import { createStatusPageSchema, publicationSchema, statusPageIdSchema } from "./validation";

export const statusPageRoutes = new Hono<OrganizationContext>();

statusPageRoutes.use("*", requireOrganization);

statusPageRoutes.get("/", async (c) => {
  const pages = await listStatusPages(c.get("organizationId"));
  return c.json(pages);
});

statusPageRoutes.post("/", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const parsed = createStatusPageSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const page = await createStatusPage(c.get("organizationId"), parsed.data);
  if (!page) return c.json({ error: "Slug already in use" }, 409);
  return c.json(page, 201);
});

statusPageRoutes.patch("/:statusPageId/publication", requireOrganizationAdmin, async (c) => {
  const pageId = statusPageIdSchema.safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = publicationSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const page = await setStatusPagePublication(c.get("organizationId"), pageId.data, parsed.data.published);
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});
