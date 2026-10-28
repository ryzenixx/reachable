import { createMiddleware } from "hono/factory";
import { cors } from "hono/cors";
import { getApplicationUrl } from "../config/urls";

function apiOrigin() {
  try {
    const url = new URL(process.env.BETTER_AUTH_URL ?? "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return url.origin;
  } catch { return undefined; }
}

const publicCors = cors({ origin: "*", allowMethods: ["GET", "HEAD", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"], maxAge: 600 });
const applicationCors = cors({ origin: (origin) => origin === getApplicationUrl()?.origin ? origin : null,
  allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"], exposeHeaders: ["Content-Disposition"], credentials: true, maxAge: 600 });

export const apiCors = createMiddleware(async (c, next) => {
  const path = c.req.path;
  const isPublic = path === "/api/public/status-pages" || path.startsWith("/api/public/status-pages/");
  return (isPublic ? publicCors : applicationCors)(c, next);
});

export const protectOrganizationOrigin = createMiddleware(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  const origin = c.req.header("Origin");
  if (origin && origin !== getApplicationUrl()?.origin && origin !== apiOrigin()) return c.json({ error: "Forbidden origin" }, 403);
  if (!origin && c.req.header("Sec-Fetch-Site") === "cross-site") return c.json({ error: "Forbidden origin" }, 403);
  await next();
});
