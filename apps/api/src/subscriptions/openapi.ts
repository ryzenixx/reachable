import { jsonContent as json } from "../http/openapi";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { preferencesSchema, publicSubscriptionSchema } from "./validation";

const error = z.object({ error: z.string() });
const slug = {
  name: "slug",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};
const token = {
  name: "token",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, pattern: "^[A-Za-z0-9_-]{43}$" },
};
const invalid = { description: "Invalid input or unavailable link", content: json(error) };
const rateLimit = {
  description: "Too many requests",
  content: json(error),
  headers: { "Retry-After": { schema: { type: "string" as const } } },
};
const redirect = {
  description: "Redirect to the current slug",
  headers: { Location: { schema: { type: "string" as const } } },
};
const notFound = { description: "Published page not found", content: json(error) };
const component = z.object({ id: z.uuid(), name: z.string() });
const preferences = z.object({
  page: z.object({ name: z.string(), slug: z.string() }),
  scope: z.enum(["all", "selected"]),
  components: z.array(component),
  selectedComponentIds: z.array(z.uuid()),
});
const body = (schema: Parameters<typeof resolver>[0]) => ({
  required: true,
  content: json(schema),
});

export const getChannelsDoc = describeRoute({
  operationId: "getPublicSubscriptionChannels",
  summary: "List available subscription channels",
  tags: ["Subscriptions"],
  parameters: [slug],
  responses: {
    200: {
      description: "Available channels",
      content: json(z.object({ channels: z.array(z.enum(["email", "webhook"])) })),
    },
    308: redirect,
    404: notFound,
  },
});
export const publicSubscribeDoc = describeRoute({
  operationId: "requestSubscription",
  summary: "Request a subscription",
  tags: ["Subscriptions"],
  parameters: [slug],
  description:
    "A confirmation email is queued when the request is eligible. Webhook subscriptions also require an email address.",
  requestBody: body(publicSubscriptionSchema),
  responses: {
    202: { description: "Request accepted", content: json(z.object({ message: z.string() })) },
    308: redirect,
    400: invalid,
    404: notFound,
    413: {
      description: "Request body exceeds 16 KiB",
      content: { "text/plain": { schema: { type: "string" } } },
    },
    415: { description: "Expected application/json", content: json(error) },
    429: rateLimit,
    503: { description: "Subscription temporarily unavailable", content: json(error) },
  },
});
export const getPreferencesDoc = describeRoute({
  operationId: "getSubscriptionPreferences",
  summary: "Get subscription preferences",
  tags: ["Subscriptions"],
  parameters: [token],
  responses: {
    200: { description: "Preferences", content: json(preferences) },
    400: invalid,
    429: rateLimit,
  },
});
export const updatePreferencesDoc = describeRoute({
  operationId: "setSubscriptionPreferences",
  summary: "Update subscription preferences",
  tags: ["Subscriptions"],
  parameters: [token],
  requestBody: body(preferencesSchema),
  responses: {
    200: {
      description: "Preferences updated",
      content: json(z.object({ success: z.literal(true) })),
    },
    400: invalid,
    413: {
      description: "Request body exceeds 256 KiB",
      content: { "text/plain": { schema: { type: "string" } } },
    },
    415: { description: "Expected application/json", content: json(error) },
    429: rateLimit,
  },
});
export const rotateSecretDoc = describeRoute({
  operationId: "rotateSubscriptionWebhookSecret",
  summary: "Rotate the webhook signing secret",
  tags: ["Subscriptions"],
  parameters: [token],
  responses: {
    200: { description: "New signing secret", content: json(z.object({ secret: z.string() })) },
    400: invalid,
    429: rateLimit,
  },
});
export function subscriptionActionDoc(purpose: "confirm" | "unsubscribe", submit: boolean) {
  return describeRoute({
    operationId: `${submit ? "submit" : "get"}Subscription${purpose === "confirm" ? "Confirmation" : "Unsubscribe"}`,
    summary: `${submit ? "Submit" : "Show"} subscription ${purpose} form`,
    tags: ["Subscriptions"],
    parameters: [token],
    responses: {
      200: {
        description: submit ? "Action completed" : "Confirmation form",
        content: { [submit ? "text/plain" : "text/html"]: { schema: { type: "string" } } },
      },
      400: {
        description: "Invalid or unavailable link",
        content: { "text/plain": { schema: { type: "string" } } },
      },
      429: rateLimit,
    },
  });
}
