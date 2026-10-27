import { Hono } from "hono";
import { getPublicStatusPage } from "./queries";

export const publicStatusPageRoutes = new Hono();

publicStatusPageRoutes.get("/:slug", async (c) => {
  c.header("Cache-Control", "no-store");
  const page = await getPublicStatusPage(c.req.param("slug"));
  if (!page) return c.json({ error: "Not found" }, 404);
  return c.json(page);
});
