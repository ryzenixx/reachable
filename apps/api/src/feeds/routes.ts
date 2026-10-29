import { Hono } from "hono";
import { getPublicFeed } from "./queries";
import { renderFeed } from "./render";
import { describeRoute } from "hono-openapi";

export const feedRoutes = new Hono();

for (const format of ["rss", "atom"] as const) {
  feedRoutes.get(
    `/:slug/feed.${format}`,
    describeRoute({
      operationId: format === "rss" ? "getPublicRssFeed" : "getPublicAtomFeed",
      summary: `Get the ${format.toUpperCase()} feed`,
      tags: ["Public status pages"],
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Feed",
          content: {
            [`application/${format === "rss" ? "rss" : "atom"}+xml`]: {
              schema: { type: "string" },
            },
          },
        },
        308: {
          description: "Redirect to the current slug",
          headers: { Location: { schema: { type: "string" } } },
        },
        404: {
          description: "Published page or enabled feed not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["error"],
                properties: { error: { type: "string" } },
              },
            },
          },
        },
        503: {
          description: "Public API URL is not configured",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["error"],
                properties: { error: { type: "string" } },
              },
            },
          },
        },
      },
    }),
    async (c) => {
      c.header("Cache-Control", "no-store");
      const feed = await getPublicFeed(c.req.param("slug"));
      if (!feed) return c.json({ error: "Not found" }, 404);
      let origin: URL;
      try {
        origin = new URL(process.env.BETTER_AUTH_URL ?? "");
        if (
          !["http:", "https:"].includes(origin.protocol) ||
          origin.username ||
          origin.password ||
          origin.pathname !== "/" ||
          origin.search ||
          origin.hash
        )
          throw new Error();
      } catch {
        return c.json({ error: "Public API URL is not configured" }, 503);
      }
      return new Response(renderFeed(feed, format, origin), {
        headers: {
          "Content-Type": `application/${format === "rss" ? "rss" : "atom"}+xml; charset=utf-8`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    },
  );
}
