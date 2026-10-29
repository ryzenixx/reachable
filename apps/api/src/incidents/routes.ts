import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { z } from "zod";
import {
  requireOrganization,
  requireOrganizationAdmin,
  requireStatusPage,
  type StatusPageContext,
} from "../organizations/access";
import {
  addIncidentUpdate,
  createHistoricalIncident,
  createIncident,
  listIncidents,
} from "./queries";
import {
  createHistoricalIncidentSchema,
  createIncidentSchema,
  createIncidentUpdateSchema,
  incidentHistoryStates,
} from "./validation";
import { parseHistoryQuery } from "../history/pagination";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { editIncidentMessage, editIncidentTitle, listIncidentEdits } from "./edits";
import { postmortemRoutes } from "../postmortems/routes";
import {
  createHistoricalIncidentDoc,
  createIncidentDoc,
  createIncidentUpdateDoc,
  editIncidentMessageDoc,
  editIncidentTitleDoc,
  listIncidentEditsDoc,
  listIncidentsDoc,
} from "./openapi";

export const incidentRoutes = new Hono<StatusPageContext>();

incidentRoutes.use("*", requireOrganization);
incidentRoutes.use("*", requireStatusPage);

incidentRoutes.route("/:incidentId/postmortem", postmortemRoutes);

incidentRoutes.get("/", listIncidentsDoc, async (c) => {
  const options = parseHistoryQuery(c.req.url, incidentHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  return c.json(await listIncidents(c.get("statusPageId"), options));
});

incidentRoutes.get(
  "/:incidentId/edits",
  listIncidentEditsDoc,
  requireOrganizationAdmin,
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("incidentId"));
    if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
    const edits = await listIncidentEdits(c.get("statusPageId"), id.data);
    if (!edits) return c.json({ error: "Not found" }, 404);
    return c.json(edits);
  },
);

incidentRoutes.patch("/:incidentId", editIncidentTitleDoc, requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const parsed = editTitleSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await editIncidentTitle(
    c.get("statusPageId"),
    id.data,
    { type: "member", id: c.get("userId") },
    parsed.data.title,
  );
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

incidentRoutes.patch(
  "/:incidentId/updates/:updateId",
  editIncidentMessageDoc,
  requireOrganizationAdmin,
  async (c) => {
    const incidentId = z.uuid().safeParse(c.req.param("incidentId"));
    const updateId = z.uuid().safeParse(c.req.param("updateId"));
    if (!incidentId.success || !updateId.success) return c.json({ error: "Invalid ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = editMessageSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const updated = await editIncidentMessage(
      c.get("statusPageId"),
      incidentId.data,
      updateId.data,
      { type: "member", id: c.get("userId") },
      parsed.data.message,
    );
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  },
);

incidentRoutes.post("/", createIncidentDoc, requireOrganizationAdmin, async (c) => {
  if (!isJsonContentType(c.req.header("content-type"))) {
    return c.json({ error: "Expected application/json" }, 415);
  }
  const parsed = createIncidentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createIncident(c.get("statusPageId"), parsed.data, {
    type: "member",
    id: c.get("userId"),
  });
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});

incidentRoutes.post(
  "/historical",
  createHistoricalIncidentDoc,
  requireOrganizationAdmin,
  async (c) => {
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = createHistoricalIncidentSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const created = await createHistoricalIncident(c.get("statusPageId"), parsed.data, {
      type: "member",
      id: c.get("userId"),
    });
    if (!created) return c.json({ error: "Invalid components" }, 400);
    return c.json(created, 201);
  },
);

incidentRoutes.post(
  "/:incidentId/updates",
  createIncidentUpdateDoc,
  requireOrganizationAdmin,
  async (c) => {
    const incidentId = z.uuid().safeParse(c.req.param("incidentId"));
    if (!incidentId.success) return c.json({ error: "Invalid incident ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type"))) {
      return c.json({ error: "Expected application/json" }, 415);
    }
    const parsed = createIncidentUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const update = await addIncidentUpdate(c.get("statusPageId"), incidentId.data, parsed.data, {
      type: "member",
      id: c.get("userId"),
    });
    if (!update) return c.json({ error: "Not found" }, 404);
    if (update === "historical")
      return c.json({ error: "Historical incident cannot be reopened" }, 409);
    if (update === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json(update, 201);
  },
);
