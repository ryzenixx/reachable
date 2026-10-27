import { Hono } from "hono";
import { z } from "zod";
import { getPublicChannels, requestEmailSubscription, useSubscriptionToken } from "./queries";

export const publicSubscriptionRoutes = new Hono();

publicSubscriptionRoutes.get("/:slug/subscription-channels", async (c) => {
  c.header("Cache-Control", "no-store");
  const channels = await getPublicChannels(c.req.param("slug"));
  if (!channels) return c.json({ error: "Not found" }, 404);
  return c.json({ channels });
});

publicSubscriptionRoutes.post("/:slug/subscriptions", async (c) => {
  c.header("Cache-Control", "no-store");
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = z.strictObject({ channel: z.literal("email"), email: z.email().max(254).transform((value) => value.toLowerCase()) })
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  try {
    const result = await requestEmailSubscription(c.req.param("slug"), input.data.email);
    if (result === "not_found") return c.json({ error: "Not found" }, 404);
    if (result === "unavailable") return c.json({ error: "Channel unavailable" }, 400);
    return c.json({ message: "If eligible, a confirmation email will be sent." }, 202);
  } catch (error) {
    console.error("Could not send subscription confirmation:", error);
    return c.json({ error: "Subscription temporarily unavailable" }, 503);
  }
});

export const subscriptionActionRoutes = new Hono();
subscriptionActionRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Content-Security-Policy", "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  await next();
});

for (const purpose of ["confirm", "unsubscribe"] as const) {
  subscriptionActionRoutes.get(`/${purpose}/:token`, (c) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(c.req.param("token"))) return c.text("Invalid link", 400);
    const label = purpose === "confirm" ? "Confirm subscription" : "Unsubscribe";
    return c.html(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${label}</title><body><main><h1>${label}</h1><form method="post"><button type="submit">${label}</button></form></main></body></html>`);
  });
  subscriptionActionRoutes.post(`/${purpose}/:token`, async (c) => {
    const token = c.req.param("token");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !await useSubscriptionToken(token, purpose)) return c.text("This link is invalid, expired, or unavailable.", 400);
    return c.text(purpose === "confirm" ? "Your subscription is confirmed." : "You have been unsubscribed.");
  });
}
