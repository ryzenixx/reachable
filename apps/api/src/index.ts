import { Hono } from "hono";
import { auth } from "./auth";
import { statusPageRoutes } from "./status-pages/routes";

const app = new Hono();

app.get("/", (c) => c.text("Hello Hono!"));
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/organizations/:organizationId/status-pages", statusPageRoutes);

export default app;
