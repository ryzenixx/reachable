import { Hono } from "hono";
import { getPublicStatusPage } from "./queries";
import { listPublicIncidents } from "../incidents/queries";
import { listPublicMaintenances } from "../maintenances/queries";
import { incidentHistoryStates } from "../incidents/validation";
import { maintenanceHistoryStates } from "../maintenances/validation";
import { parseHistoryQuery } from "../history/pagination";

export const publicStatusPageRoutes = new Hono();

publicStatusPageRoutes.get("/:slug/maintenances", async (c) => {
  c.header("Cache-Control", "no-store");
  const options = parseHistoryQuery(c.req.url, maintenanceHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  const maintenances = await listPublicMaintenances(c.req.param("slug"), options);
  if (!maintenances) return c.json({ error: "Not found" }, 404);
  return c.json(maintenances);
});

publicStatusPageRoutes.get("/:slug/incidents", async (c) => {
  c.header("Cache-Control", "no-store");
  const options = parseHistoryQuery(c.req.url, incidentHistoryStates);
  if (!options) return c.json({ error: "Invalid query parameters" }, 400);
  const incidents = await listPublicIncidents(c.req.param("slug"), options);
  if (!incidents) return c.json({ error: "Not found" }, 404);
  return c.json(incidents);
});

publicStatusPageRoutes.get("/:slug", async (c) => {
  c.header("Cache-Control", "no-store");
  const page = await getPublicStatusPage(c.req.param("slug"));
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});
