import { Hono } from "hono";
import { auth } from "./auth";
import { componentRoutes } from "./components/routes";
import { incidentRoutes } from "./incidents/routes";
import { maintenanceRoutes } from "./maintenances/routes";
import { channelRoutes } from "./subscriptions/channels";
import { publicSubscriptionRoutes, subscriptionActionRoutes } from "./subscriptions/routes";
import { statusPageRoutes } from "./status-pages/routes";
import { publicStatusPageRoutes } from "./status-pages/public-routes";
import { getApplicationUrl } from "./organizations/invitations";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));
app.use("/api/auth/organization/invite-member", async (c, next) => {
  if (c.req.method === "POST" && (!getApplicationUrl() || !process.env.SMTP_URL || !process.env.EMAIL_FROM)) {
    return c.json({ error: "Invitation email is not configured" }, 503);
  }
  await next();
});
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/public/status-pages", publicStatusPageRoutes);
app.route("/api/public/status-pages", publicSubscriptionRoutes);
app.route("/api/subscriptions", subscriptionActionRoutes);
app.route("/api/organizations/:organizationId/notification-channels", channelRoutes);
app.route("/api/organizations/:organizationId/status-pages", statusPageRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/components", componentRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/incidents", incidentRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/maintenances", maintenanceRoutes);

export default app;
