import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { db } from "../db";

export const healthRoutes = new Hono();
let databaseProbe: Promise<boolean> | undefined;

function probeDatabase() {
  if (databaseProbe) return databaseProbe;
  const current = db.execute(sql`select 1`).then(() => true, () => false);
  databaseProbe = current;
  void current.then(() => { if (databaseProbe === current) databaseProbe = undefined; });
  return current;
}

healthRoutes.use("*", async (c, next) => { c.header("Cache-Control", "no-store"); await next(); });
const ok = z.object({ status: z.literal("ok") });
const unavailable = z.object({ status: z.literal("unavailable") });

healthRoutes.get("/live", describeRoute({
  operationId: "getLiveness",
  tags: ["Health"],
  summary: "Check whether the API is running",
  responses: { 200: { description: "The API is running", content: { "application/json": { schema: resolver(ok) } } } },
}), (c) => c.json({ status: "ok" }));
healthRoutes.get("/ready", describeRoute({
  operationId: "getReadiness",
  tags: ["Health"],
  summary: "Check whether the API can reach the database",
  responses: {
    200: { description: "The API is ready", content: { "application/json": { schema: resolver(ok) } } },
    503: { description: "The database is unavailable", content: { "application/json": { schema: resolver(unavailable) } } },
  },
}), async (c) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = await Promise.race([
    probeDatabase(),
    new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), 2000); }),
  ]).finally(() => clearTimeout(timer));
  return ready ? c.json({ status: "ok" }) : c.json({ status: "unavailable" }, 503);
});
