import { Hono } from "hono";
import { sql } from "drizzle-orm";
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
healthRoutes.get("/live", (c) => c.json({ status: "ok" }));
healthRoutes.get("/ready", async (c) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = await Promise.race([
    probeDatabase(),
    new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), 2000); }),
  ]).finally(() => clearTimeout(timer));
  return ready ? c.json({ status: "ok" }) : c.json({ status: "unavailable" }, 503);
});
