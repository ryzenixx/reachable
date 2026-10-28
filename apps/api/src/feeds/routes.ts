import { Hono } from "hono";
import { getPublicFeed } from "./queries";
import { renderFeed } from "./render";

export const feedRoutes = new Hono();

for (const format of ["rss", "atom"] as const) {
  feedRoutes.get(`/:slug/feed.${format}`, async (c) => {
    c.header("Cache-Control", "no-store");
    const feed = await getPublicFeed(c.req.param("slug"));
    if (!feed) return c.json({ error: "Not found" }, 404);
    let origin: URL;
    try {
      origin = new URL(process.env.BETTER_AUTH_URL ?? "");
      if (!(["http:", "https:"].includes(origin.protocol)) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error();
    } catch {
      return c.json({ error: "Public API URL is not configured" }, 503);
    }
    return new Response(renderFeed(feed, format, origin), { headers: {
      "Content-Type": `application/${format === "rss" ? "rss" : "atom"}+xml; charset=utf-8`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  });
}
