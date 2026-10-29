import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { z } from "zod";
import {
  requireOrganization,
  requireOrganizationAdmin,
  requireStatusPage,
  type StatusPageContext,
} from "../organizations/access";
import { addMaintenanceUpdate, createMaintenance, listMaintenances } from "./queries";
import {
  createMaintenanceSchema,
  createMaintenanceUpdateSchema,
  maintenanceHistoryStates,
} from "./validation";
import { parseHistoryQuery } from "../history/pagination";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { editMaintenanceMessage, editMaintenanceTitle, listMaintenanceEdits } from "./edits";
import {
  createMaintenanceDoc,
  createMaintenanceUpdateDoc,
  editMaintenanceMessageDoc,
  editMaintenanceTitleDoc,
  listMaintenanceEditsDoc,
  listMaintenancesDoc,
} from "./openapi";

export const maintenanceRoutes = new Hono<StatusPageContext>();

maintenanceRoutes.use("*", requireOrganization);
maintenanceRoutes.use("*", requireStatusPage);

maintenanceRoutes.get("/", listMaintenancesDoc, async (c) => {
  const options = parseHistoryQuery(c.req.url, maintenanceHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  return c.json(await listMaintenances(c.get("statusPageId"), options));
});

maintenanceRoutes.get(
  "/:maintenanceId/edits",
  listMaintenanceEditsDoc,
  requireOrganizationAdmin,
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("maintenanceId"));
    if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
    const edits = await listMaintenanceEdits(c.get("statusPageId"), id.data);
    if (!edits) return c.json({ error: "Not found" }, 404);
    return c.json(edits);
  },
);

maintenanceRoutes.patch(
  "/:maintenanceId",
  editMaintenanceTitleDoc,
  requireOrganizationAdmin,
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("maintenanceId"));
    if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = editTitleSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const updated = await editMaintenanceTitle(
      c.get("statusPageId"),
      id.data,
      { type: "member", id: c.get("userId") },
      parsed.data.title,
    );
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  },
);

maintenanceRoutes.patch(
  "/:maintenanceId/updates/:updateId",
  editMaintenanceMessageDoc,
  requireOrganizationAdmin,
  async (c) => {
    const maintenanceId = z.uuid().safeParse(c.req.param("maintenanceId"));
    const updateId = z.uuid().safeParse(c.req.param("updateId"));
    if (!maintenanceId.success || !updateId.success) return c.json({ error: "Invalid ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = editMessageSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const updated = await editMaintenanceMessage(
      c.get("statusPageId"),
      maintenanceId.data,
      updateId.data,
      { type: "member", id: c.get("userId") },
      parsed.data.message,
    );
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  },
);
maintenanceRoutes.post("/", createMaintenanceDoc, requireOrganizationAdmin, async (c) => {
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const parsed = createMaintenanceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createMaintenance(c.get("statusPageId"), parsed.data, {
    type: "member",
    id: c.get("userId"),
  });
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});

maintenanceRoutes.post(
  "/:maintenanceId/updates",
  createMaintenanceUpdateDoc,
  requireOrganizationAdmin,
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("maintenanceId"));
    if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = createMaintenanceUpdateSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const update = await addMaintenanceUpdate(c.get("statusPageId"), id.data, parsed.data, {
      type: "member",
      id: c.get("userId"),
    });
    if (!update) return c.json({ error: "Not found" }, 404);
    if (update === "completed")
      return c.json({ error: "Completed maintenance cannot be reopened" }, 409);
    if (update === "cancelled")
      return c.json({ error: "Cancelled maintenance cannot be reopened" }, 409);
    if (update === "cannot_cancel")
      return c.json({ error: "Only scheduled maintenance can be cancelled" }, 409);
    if (update === "invalid_window") return c.json({ error: "Invalid maintenance window" }, 400);
    if (update === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json(update, 201);
  },
);
