import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getPath } from "hono/utils/url";
import { auth } from "./auth";
import { componentRoutes } from "./components/routes";
import { componentGroupRoutes } from "./component-groups/routes";
import { incidentRoutes } from "./incidents/routes";
import { maintenanceRoutes } from "./maintenances/routes";
import { notificationRoutes } from "./notifications/routes";
import { channelRoutes } from "./subscriptions/channels";
import { publicSubscriptionRoutes, subscriptionActionRoutes } from "./subscriptions/routes";
import { statusPageRoutes } from "./status-pages/routes";
import { publicStatusPageRoutes } from "./status-pages/public-routes";
import { getApplicationUrl } from "./config/urls";
import { resolvePublicSlug } from "./status-pages/queries";
import { activityRoutes } from "./activity/routes";
import { withAuthActor } from "./activity/auth-context";
import { adminSubscriptionRoutes } from "./subscriptions/admin-routes";
import { authEmailRoutes } from "./notifications/auth-email/routes";
import { brandingRoutes } from "./branding/routes";
import { templateRoutes } from "./templates/routes";
import { apiKeyRoutes } from "./api-keys/routes";
import { integrationRoutes } from "./api-keys/integration-routes";
import { apiCors, protectOrganizationOrigin } from "./http/origins";
import { healthRoutes } from "./health/routes";
import { withClientIp } from "./http/client-ip";
import { protectPublicRequests, publicRateLimitScope } from "./http/rate-limit";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));
app.route("/health", healthRoutes);
app.use("/api/*", apiCors);
app.use("/api/*", (c, next) => {
  const imageUpload = c.req.method === "PUT" && /^\/api\/organizations\/[^/]+\/status-pages\/[^/]+\/branding\/assets\/[^/]+\/?$/.test(c.req.path);
  return bodyLimit({ maxSize: imageUpload ? 2 * 1024 * 1024 : 256 * 1024 })(c, next);
});
app.use("/api/*", protectPublicRequests);
app.use("/api/organizations/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});
app.use("/api/organizations/*", protectOrganizationOrigin);
app.use("/api/auth/organization/invite-member", async (c, next) => {
  if (c.req.method === "POST" && !getApplicationUrl()) {
    return c.json({ error: "Invitation email is not configured" }, 503);
  }
  await next();
});
app.all("/api/auth/*", async (c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/auth/api-key/")) return c.json({ error: "Not found" }, 404);
  if (!new URL(c.req.url).pathname.startsWith("/api/auth/organization/")) return auth.handler(c.req.raw);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return withAuthActor(session?.user.id ?? null, () => auth.handler(c.req.raw));
});
app.use("/api/public/status-pages/:slug/*", async (c, next) => {
  const slug = c.req.param("slug");
  const canonical = await resolvePublicSlug(slug);
  if (canonical && canonical !== slug) {
    const url = new URL(c.req.url);
    const segments = url.pathname.split("/");
    segments[4] = encodeURIComponent(canonical);
    c.header("Cache-Control", "no-store");
    return c.redirect(segments.join("/") + url.search, 308);
  }
  await next();
});
app.route("/api/public/status-pages", publicStatusPageRoutes);
app.route("/api/public/status-pages", publicSubscriptionRoutes);
app.route("/api/subscriptions", subscriptionActionRoutes);
app.route("/api/integrations/status-pages", integrationRoutes);
app.route("/api/organizations/:organizationId/api-keys", apiKeyRoutes);
app.route("/api/organizations/:organizationId/notification-channels", channelRoutes);
app.route("/api/organizations/:organizationId/activity", activityRoutes);
app.route("/api/organizations/:organizationId/invitation-deliveries", authEmailRoutes);
app.route("/api/organizations/:organizationId/status-pages", statusPageRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/components", componentRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/component-groups", componentGroupRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/incidents", incidentRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/maintenances", maintenanceRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/notifications", notificationRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/subscriptions", adminSubscriptionRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/branding", brandingRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/templates", templateRoutes);

export default {
  fetch(request: Request, server: Bun.Server<unknown>) {
    const path = getPath(request);
    const needsClientIp = path.startsWith("/api/auth/") || publicRateLimitScope(path, request.method);
    if (!needsClientIp || request.method === "OPTIONS") return app.fetch(request);
    const safeRequest = withClientIp(request, server.requestIP(request)?.address);
    if (!safeRequest) return new Response("Invalid client IP", { status: 400 });
    return app.fetch(safeRequest);
  },
};
