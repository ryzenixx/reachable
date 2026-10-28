import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { getPublicChannels, requestEmailSubscription, useSubscriptionToken } from "./queries";
import { getSubscriptionPreferences, setSubscriptionPreferences } from "./preferences";
import { emailSchema, preferencesSchema } from "./validation";
import { requestWebhookSubscription, rotateWebhookSecret } from "../webhooks/subscriptions";
import { parseWebhookUrl } from "../webhooks/transport";

export const publicSubscriptionRoutes = new Hono();

publicSubscriptionRoutes.get("/:slug/subscription-channels", async (c) => {
  c.header("Cache-Control", "no-store");
  const channels = await getPublicChannels(c.req.param("slug"));
  if (!channels) return c.json({ error: "Not found" }, 404);
  return c.json({ channels });
});

publicSubscriptionRoutes.post("/:slug/subscriptions", bodyLimit({ maxSize: 16384 }), async (c) => {
  c.header("Cache-Control", "no-store");
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = z.discriminatedUnion("channel", [
    z.strictObject({ channel: z.literal("email"), email: emailSchema, preferences: preferencesSchema.optional() }),
    z.strictObject({ channel: z.literal("webhook"), email: emailSchema, url: z.string().max(2048), preferences: preferencesSchema.optional() }),
  ])
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  try {
    const url = input.data.channel === "webhook" ? parseWebhookUrl(input.data.url) : undefined;
    if (input.data.channel === "webhook" && !url) return c.json({ error: "Invalid webhook URL" }, 400);
    const result = input.data.channel === "email"
      ? await requestEmailSubscription({ type: "public", slug: c.req.param("slug"), email: input.data.email, preferences: input.data.preferences })
      : await requestWebhookSubscription(c.req.param("slug"), url!.toString(), input.data.email, input.data.preferences);
    if (result === "not_found") return c.json({ error: "Not found" }, 404);
    if (result === "unavailable") return c.json({ error: "Channel unavailable" }, 400);
    if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json({ message: "If eligible, a confirmation email will be queued." }, 202);
  } catch {
    console.error("Could not queue subscription confirmation");
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


subscriptionActionRoutes.get("/manage/:token", async (c) => {
  const token = c.req.param("token");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return c.json({ error: "Invalid link" }, 400);
  const preferences = await getSubscriptionPreferences(token);
  if (!preferences) return c.json({ error: "Invalid or unavailable link" }, 400);
  return c.json(preferences);
});

subscriptionActionRoutes.put("/manage/:token", async (c) => {
  const token = c.req.param("token");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return c.json({ error: "Invalid link" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const parsed = preferencesSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  const result = await setSubscriptionPreferences(token, parsed.data);
  if (result === "invalid_token") return c.json({ error: "Invalid or unavailable link" }, 400);
  if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
  return c.json({ success: true });
});

subscriptionActionRoutes.post("/manage/:token/webhook-secret", async (c) => {
  const token = c.req.param("token");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return c.json({ error: "Invalid link" }, 400);
  const secret = await rotateWebhookSecret(token);
  if (!secret) return c.json({ error: "Invalid or unavailable link" }, 400);
  return c.json({ secret });
});

for (const purpose of ["confirm", "unsubscribe"] as const) {
  subscriptionActionRoutes.get(`/${purpose}/:token`, (c) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(c.req.param("token"))) return c.text("Invalid link", 400);
    const label = purpose === "confirm" ? "Confirm subscription" : "Unsubscribe";
    return c.html(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${label}</title><body><main><h1>${label}</h1><form method="post"><button type="submit">${label}</button></form></main></body></html>`);
  });
  subscriptionActionRoutes.post(`/${purpose}/:token`, async (c) => {
    const token = c.req.param("token");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return c.text("This link is invalid, expired, or unavailable.", 400);
    const result = await useSubscriptionToken(token, purpose);
    if (!result) return c.text("This link is invalid, expired, or unavailable.", 400);
    if (typeof result === "string") return c.text(`Your webhook subscription is confirmed. Save this signing secret; it will not be shown again:\n\n${result}`);
    return c.text(purpose === "confirm" ? "Your subscription is confirmed." : "You have been unsubscribed.");
  });
}
