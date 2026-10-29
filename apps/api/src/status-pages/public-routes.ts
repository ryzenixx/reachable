import { Hono } from "hono";
import { getPublicStatusPage } from "./queries";
import { listPublicIncidents } from "../incidents/queries";
import { listPublicMaintenances } from "../maintenances/queries";
import { incidentHistoryStates } from "../incidents/validation";
import { maintenanceHistoryStates } from "../maintenances/validation";
import { parseHistoryQuery } from "../history/pagination";
import { getComponentHistory, listComponentStateChanges, parseHistoryRange } from "../components/history";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAsset } from "../branding/queries";
import { assetKinds } from "../branding/validation";
import { feedRoutes } from "../feeds/routes";
import { historyDoc } from "../components/history-openapi";
import { describeRoute } from "hono-openapi";
import { listPublicIncidentsDoc } from "../incidents/openapi";
import { listPublicMaintenancesDoc } from "../maintenances/openapi";
import { getPublicStatusPageDoc } from "./public-openapi";

export const publicStatusPageRoutes = new Hono();
publicStatusPageRoutes.route("/", feedRoutes);

publicStatusPageRoutes.get("/:slug/branding/assets/:kind", describeRoute({
  operationId: "getPublicBrandingAsset", summary: "Get a published branding asset", tags: ["Public status pages"],
  parameters: [
    { name: "slug", in: "path", required: true, schema: { type: "string" } },
    { name: "kind", in: "path", required: true, schema: { type: "string", enum: [...assetKinds] } },
  ],
  responses: {
    200: { description: "PNG image", content: { "image/png": { schema: { type: "string", format: "binary" } } } },
    308: { description: "Redirect to the current slug", headers: { Location: { schema: { type: "string" } } } },
    400: { description: "Invalid asset kind", content: { "application/json": { schema: { type: "object", required: ["error"], properties: { error: { type: "string" } } } } } },
    404: { description: "Published page or asset not found", content: { "application/json": { schema: { type: "object", required: ["error"], properties: { error: { type: "string" } } } } } },
  },
}), async (c) => {
  c.header("Cache-Control", "no-store");
  const kind = z.enum(assetKinds).safeParse(c.req.param("kind"));
  if (!kind.success) return c.json({ error: "Invalid asset kind" }, 400);
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, c.req.param("slug")), eq(statusPage.published, true)));
  if (!page) return c.json({ error: "Not found" }, 404);
  const asset = await getAsset(page.id, kind.data, true);
  if (!asset) return c.json({ error: "Not found" }, 404);
  return new Response(new Uint8Array(asset.content), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
});

publicStatusPageRoutes.get("/:slug/components/:componentId/history", historyDoc(true, false), async (c) => {
  c.header("Cache-Control", "no-store");
  const id = z.uuid().safeParse(c.req.param("componentId"));
  if (!id.success) return c.json({ error: "Invalid component ID" }, 400);
  const url = new URL(c.req.url);
  const range = parseHistoryRange(url);
  if (!range || [...url.searchParams].length) return c.json({ error: "Invalid history range" }, 400);
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, c.req.param("slug")), eq(statusPage.published, true)));
  if (!page) return c.json({ error: "Not found" }, 404);
  const history = await getComponentHistory(page.id, id.data, range, true);
  if (!history) return c.json({ error: "Not found" }, 404);
  return c.json(history);
});

publicStatusPageRoutes.get("/:slug/components/:componentId/history/changes", historyDoc(true, true), async (c) => {
  c.header("Cache-Control", "no-store");
  const id = z.uuid().safeParse(c.req.param("componentId"));
  if (!id.success) return c.json({ error: "Invalid component ID" }, 400);
  const url = new URL(c.req.url);
  const range = parseHistoryRange(url);
  const options = parseHistoryQuery(url.toString(), ["all"] as const);
  if (!range || !options) return c.json({ error: "Invalid query parameters" }, 400);
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.slug, c.req.param("slug")), eq(statusPage.published, true)));
  if (!page) return c.json({ error: "Not found" }, 404);
  const history = await listComponentStateChanges(page.id, id.data, range, options.limit, options.cursor, true);
  if (!history) return c.json({ error: "Not found" }, 404);
  return c.json({ from: range.from, to: range.to, ...history });
});

publicStatusPageRoutes.get("/:slug/maintenances", listPublicMaintenancesDoc, async (c) => {
  c.header("Cache-Control", "no-store");
  const options = parseHistoryQuery(c.req.url, maintenanceHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  const maintenances = await listPublicMaintenances(c.req.param("slug"), options);
  if (!maintenances) return c.json({ error: "Not found" }, 404);
  return c.json(maintenances);
});

publicStatusPageRoutes.get("/:slug/incidents", listPublicIncidentsDoc, async (c) => {
  c.header("Cache-Control", "no-store");
  const options = parseHistoryQuery(c.req.url, incidentHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  const incidents = await listPublicIncidents(c.req.param("slug"), options);
  if (!incidents) return c.json({ error: "Not found" }, 404);
  return c.json(incidents);
});

publicStatusPageRoutes.get("/:slug", getPublicStatusPageDoc, async (c) => {
  c.header("Cache-Control", "no-store");
  const page = await getPublicStatusPage(c.req.param("slug"));
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});
