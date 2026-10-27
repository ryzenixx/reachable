import { Hono } from "hono";
import { auth } from "./auth";
import { componentRoutes } from "./components/routes";
import { statusPageRoutes } from "./status-pages/routes";
import { publicStatusPageRoutes } from "./status-pages/public-routes";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/public/status-pages", publicStatusPageRoutes);
app.route("/api/organizations/:organizationId/status-pages", statusPageRoutes);
app.route("/api/organizations/:organizationId/status-pages/:statusPageId/components", componentRoutes);

export default app;
