import { Hono } from "hono";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { addIncidentUpdate, createIncident, listIncidents } from "./queries";
import { createIncidentSchema, createIncidentUpdateSchema } from "./validation";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { editIncidentMessage, editIncidentTitle, listIncidentEdits } from "./edits";

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

incidentRoutes.get("/:incidentId/edits", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  const edits = await listIncidentEdits(c.get("statusPageId"), id.data);
  if (!edits) return c.json({ error: "Not found" }, 404);
  return c.json(edits);
});

incidentRoutes.patch("/:incidentId", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = editTitleSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await editIncidentTitle(c.get("statusPageId"), id.data, c.get("userId"), parsed.data.title);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

incidentRoutes.patch("/:incidentId/updates/:updateId", requireOrganizationAdmin, async (c) => {
  const incidentId = z.uuid().safeParse(c.req.param("incidentId"));
  const updateId = z.uuid().safeParse(c.req.param("updateId"));
  if (!incidentId.success || !updateId.success) return c.json({ error: "Invalid ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = editMessageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await editIncidentMessage(c.get("statusPageId"), incidentId.data, updateId.data, c.get("userId"), parsed.data.message);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

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
  if (update === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(update, 201);
});
