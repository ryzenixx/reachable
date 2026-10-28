import { Hono } from "hono";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../organizations/access";
import { createStatusPage, getStatusPage, isStatusPageSlugAvailable, listStatusPages, setStatusPagePublication, updateStatusPage } from "./queries";
import { createStatusPageSchema, publicationSchema, statusPageIdSchema, statusPageSlugSchema, updateStatusPageSchema } from "./validation";

export const statusPageRoutes = new Hono<OrganizationContext>();

statusPageRoutes.use("*", requireOrganization);

statusPageRoutes.get("/", async (c) => {
  const pages = await listStatusPages(c.get("organizationId"));
  return c.json(pages);
});

statusPageRoutes.get("/slug-availability", async (c) => {
  const slug = statusPageSlugSchema.safeParse(c.req.query("slug"));
  if (!slug.success) return c.json({ error: "Invalid slug" }, 400);
  c.header("Cache-Control", "no-store");
  return c.json({ available: await isStatusPageSlugAvailable(slug.data) });
});

statusPageRoutes.get("/:statusPageId", async (c) => {
  const id = statusPageIdSchema.safeParse(c.req.param("statusPageId"));
  if (!id.success) return c.json({ error: "Invalid page ID" }, 400);
  const page = await getStatusPage(c.get("organizationId"), id.data);
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});

statusPageRoutes.patch("/:statusPageId", requireOrganizationAdmin, async (c) => {
  const id = statusPageIdSchema.safeParse(c.req.param("statusPageId"));
  if (!id.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = updateStatusPageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const page = await updateStatusPage(c.get("organizationId"), id.data, parsed.data, c.get("userId"));
  if (!page) return c.json({ error: "Not found" }, 404);
  if (page === "slug_taken") return c.json({ error: "Slug already in use" }, 409);
  return c.json(page);
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

  const page = await createStatusPage(c.get("organizationId"), parsed.data, c.get("userId"));
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
  const page = await setStatusPagePublication(c.get("organizationId"), pageId.data, parsed.data.published, c.get("userId"));
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});
