import { Hono } from "hono";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { addIncidentUpdate, createIncident, listIncidents } from "./queries";
import { createIncidentSchema, createIncidentUpdateSchema } from "./validation";

type IncidentContext = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };

export const incidentRoutes = new Hono<IncidentContext>();

incidentRoutes.use("*", requireOrganization);
incidentRoutes.use("*", async (c, next) => {
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) {
    return c.json({ error: "Not found" }, 404);
  }
  c.set("statusPageId", pageId.data);
  await next();
});

incidentRoutes.get("/", async (c) => c.json(await listIncidents(c.get("statusPageId"))));

incidentRoutes.post("/", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const parsed = createIncidentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createIncident(c.get("statusPageId"), parsed.data);
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});

incidentRoutes.post("/:incidentId/updates", requireOrganizationAdmin, async (c) => {
  const incidentId = z.uuid().safeParse(c.req.param("incidentId"));
  if (!incidentId.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const parsed = createIncidentUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const update = await addIncidentUpdate(c.get("statusPageId"), incidentId.data, parsed.data);
  if (!update) return c.json({ error: "Not found" }, 404);
  return c.json(update, 201);
});
