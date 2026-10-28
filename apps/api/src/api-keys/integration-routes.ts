import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { auth } from "../auth";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { listComponents, updateComponent } from "../components/queries";
import { componentStatus } from "../db/schema/component";
import { addIncidentUpdate, createHistoricalIncident, createIncident, listIncidents } from "../incidents/queries";
import { createHistoricalIncidentSchema, createIncidentSchema, createIncidentUpdateSchema, incidentHistoryStates } from "../incidents/validation";
import { editIncidentMessage, editIncidentTitle } from "../incidents/edits";
import { addMaintenanceUpdate, createMaintenance, listMaintenances } from "../maintenances/queries";
import { createMaintenanceSchema, createMaintenanceUpdateSchema, maintenanceHistoryStates } from "../maintenances/validation";
import { editMaintenanceMessage, editMaintenanceTitle } from "../maintenances/edits";
import { parseHistoryQuery } from "../history/pagination";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";

const metadataSchema = z.strictObject({ pageId: z.uuid() });
type Context = { Variables: { pageId: string; keyId: string } };
type Resource = "components" | "incidents" | "maintenances";

function requireKey(resource: Resource, action: "read" | "write") {
  return createMiddleware<Context>(async (c, next) => {
    c.header("Cache-Control", "no-store");
    const page = z.uuid().safeParse(c.req.param("pageId"));
    if (!page.success) return c.json({ error: "Invalid page ID" }, 400);
    const header = c.req.header("authorization");
    const token = header?.match(/^Bearer (rck_[A-Za-z0-9_-]+)$/i)?.[1];
    if (!token || token.length > 256) return c.json({ error: "Unauthorized" }, 401);
    const result = await auth.api.verifyApiKey({ body: { key: token, permissions: { [resource]: [action] } } });
    if (!result.valid || !result.key) {
      if (result.error?.code === "RATE_LIMITED") return c.json({ error: "Rate limit exceeded" }, 429);
      return c.json({ error: "Unauthorized" }, 401);
    }
    const metadata = metadataSchema.safeParse(result.key.metadata);
    if (!metadata.success || metadata.data.pageId !== page.data ||
      !await pageBelongsToOrganization(page.data, result.key.referenceId)) return c.json({ error: "Forbidden" }, 403);
    c.set("pageId", page.data);
    c.set("keyId", result.key.id);
    await next();
  });
}

export const integrationRoutes = new Hono<Context>();
integrationRoutes.use("*", bodyLimit({ maxSize: 32768 }));

integrationRoutes.get("/:pageId/components", requireKey("components", "read"), async (c) => c.json(await listComponents(c.get("pageId"))));
integrationRoutes.patch("/:pageId/components/:componentId/status", requireKey("components", "write"), async (c) => {
  const id = z.uuid().safeParse(c.req.param("componentId"));
  if (!id.success) return c.json({ error: "Invalid component ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = z.strictObject({ status: z.enum(componentStatus.enumValues) }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const updated = await updateComponent(c.get("pageId"), id.data, input.data, { type: "api_key", id: c.get("keyId") });
  if (!updated || updated === "invalid_group") return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

integrationRoutes.get("/:pageId/incidents", requireKey("incidents", "read"), async (c) => {
  const options = parseHistoryQuery(c.req.url, incidentHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  return c.json(await listIncidents(c.get("pageId"), options));
});
integrationRoutes.post("/:pageId/incidents", requireKey("incidents", "write"), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = createIncidentSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createIncident(c.get("pageId"), input.data, { type: "api_key", id: c.get("keyId") });
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});
integrationRoutes.post("/:pageId/incidents/historical", requireKey("incidents", "write"), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = createHistoricalIncidentSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createHistoricalIncident(c.get("pageId"), input.data, { type: "api_key", id: c.get("keyId") });
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});
integrationRoutes.post("/:pageId/incidents/:incidentId/updates", requireKey("incidents", "write"), async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = createIncidentUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const result = await addIncidentUpdate(c.get("pageId"), id.data, input.data, { type: "api_key", id: c.get("keyId") });
  if (!result) return c.json({ error: "Not found" }, 404);
  if (result === "historical") return c.json({ error: "Historical incident cannot be reopened" }, 409);
  if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(result, 201);
});

integrationRoutes.get("/:pageId/maintenances", requireKey("maintenances", "read"), async (c) => {
  const options = parseHistoryQuery(c.req.url, maintenanceHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  return c.json(await listMaintenances(c.get("pageId"), options));
});
integrationRoutes.post("/:pageId/maintenances", requireKey("maintenances", "write"), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = createMaintenanceSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const created = await createMaintenance(c.get("pageId"), input.data, { type: "api_key", id: c.get("keyId") });
  if (!created) return c.json({ error: "Invalid components" }, 400);
  return c.json(created, 201);
});
integrationRoutes.post("/:pageId/maintenances/:maintenanceId/updates", requireKey("maintenances", "write"), async (c) => {
  const id = z.uuid().safeParse(c.req.param("maintenanceId"));
  if (!id.success) return c.json({ error: "Invalid maintenance ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = createMaintenanceUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const result = await addMaintenanceUpdate(c.get("pageId"), id.data, input.data, { type: "api_key", id: c.get("keyId") });
  if (!result) return c.json({ error: "Not found" }, 404);
  if (result === "completed") return c.json({ error: "Completed maintenance cannot be reopened" }, 409);
  if (result === "cancelled") return c.json({ error: "Cancelled maintenance cannot be reopened" }, 409);
  if (result === "cannot_cancel") return c.json({ error: "Only scheduled maintenance can be cancelled" }, 409);
  if (result === "invalid_window") return c.json({ error: "Invalid maintenance window" }, 400);
  if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json(result, 201);
});

for (const resource of ["incidents", "maintenances"] as const) {
  integrationRoutes.patch(`/:pageId/${resource}/:id`, requireKey(resource, "write"), async (c) => {
    const id = z.uuid().safeParse(c.req.param("id"));
    if (!id.success) return c.json({ error: "Invalid ID" }, 400);
    if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
    const input = editTitleSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: "Invalid input" }, 400);
    const actor = { type: "api_key" as const, id: c.get("keyId") };
    const result = resource === "incidents"
      ? await editIncidentTitle(c.get("pageId"), id.data, actor, input.data.title)
      : await editMaintenanceTitle(c.get("pageId"), id.data, actor, input.data.title);
    if (!result) return c.json({ error: "Not found" }, 404);
    return c.json(result);
  });
  integrationRoutes.patch(`/:pageId/${resource}/:id/updates/:updateId`, requireKey(resource, "write"), async (c) => {
    const id = z.uuid().safeParse(c.req.param("id"));
    const updateId = z.uuid().safeParse(c.req.param("updateId"));
    if (!id.success || !updateId.success) return c.json({ error: "Invalid ID" }, 400);
    if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
    const input = editMessageSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: "Invalid input" }, 400);
    const actor = { type: "api_key" as const, id: c.get("keyId") };
    const result = resource === "incidents"
      ? await editIncidentMessage(c.get("pageId"), id.data, updateId.data, actor, input.data.message)
      : await editMaintenanceMessage(c.get("pageId"), id.data, updateId.data, actor, input.data.message);
    if (!result) return c.json({ error: "Not found" }, 404);
    return c.json(result);
  });
}
