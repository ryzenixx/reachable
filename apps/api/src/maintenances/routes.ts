import { Hono } from "hono";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { addMaintenanceUpdate, createMaintenance, listMaintenances } from "./queries";
import { createMaintenanceSchema, createMaintenanceUpdateSchema } from "./validation";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { editMaintenanceMessage, editMaintenanceTitle, listMaintenanceEdits } from "./edits";

type MaintenanceContext = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };

export const maintenanceRoutes = new Hono<MaintenanceContext>();

maintenanceRoutes.use("*", requireOrganization);
maintenanceRoutes.use("*", async (c, next) => {
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  c.set("statusPageId", pageId.data);
  await next();
});

maintenanceRoutes.get("/", async (c) => c.json(await listMaintenances(c.get("statusPageId"))));

maintenanceRoutes.get("/:maintenanceId/edits", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("maintenanceId"));
  if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
  const edits = await listMaintenanceEdits(c.get("statusPageId"), id.data);
  if (!edits) return c.json({ error: "Not found" }, 404);
  return c.json(edits);
});

maintenanceRoutes.patch("/:maintenanceId", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("maintenanceId"));
  if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = editTitleSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await editMaintenanceTitle(c.get("statusPageId"), id.data, c.get("userId"), parsed.data.title);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

maintenanceRoutes.patch("/:maintenanceId/updates/:updateId", requireOrganizationAdmin, async (c) => {
  const maintenanceId = z.uuid().safeParse(c.req.param("maintenanceId"));
  const updateId = z.uuid().safeParse(c.req.param("updateId"));
  if (!maintenanceId.success || !updateId.success) return c.json({ error: "Invalid ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = editMessageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await editMaintenanceMessage(c.get("statusPageId"), maintenanceId.data, updateId.data, c.get("userId"), parsed.data.message);
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});
maintenanceRoutes.post("/", requireOrganizationAdmin, async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = createMaintenanceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createMaintenance(c.get("statusPageId"), parsed.data);
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});

maintenanceRoutes.post("/:maintenanceId/updates", requireOrganizationAdmin, async (c) => {
  const id = z.uuid().safeParse(c.req.param("maintenanceId"));
  if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = createMaintenanceUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const update = await addMaintenanceUpdate(c.get("statusPageId"), id.data, parsed.data);
  if (!update) return c.json({ error: "Not found" }, 404);
  if (update === "completed") return c.json({ error: "Completed maintenance cannot be reopened" }, 409);
  if (update === "cancelled") return c.json({ error: "Cancelled maintenance cannot be reopened" }, 409);
  if (update === "cannot_cancel") return c.json({ error: "Only scheduled maintenance can be cancelled" }, 409);
  if (update === "invalid_window") return c.json({ error: "Invalid maintenance window" }, 400);
  if (update === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(update, 201);
});
