import { jsonContent as json } from "../http/openapi";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { emailSchema, preferencesSchema } from "./validation";

const date = z.iso.datetime();
const subscriber = z.object({
  id: z.uuid(),
  channel: z.string(),
  destination: z.string(),
  confirmedAt: date.nullable(),
  createdAt: date,
  lastRequestedAt: date,
  state: z.enum(["confirmed", "pending"]),
  scope: z.enum(["all", "selected"]),
  components: z.array(z.object({ id: z.uuid(), name: z.string() })),
});
const error = z.object({ error: z.string() });
const path = (name: string, format?: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, ...(format && { format }) },
});
const base = [path("organizationId"), path("statusPageId", "uuid")];
const item = [...base, path("subscriptionId", "uuid")];
const query = (name: string) => ({
  name,
  in: "query" as const,
  schema: { type: "string" as const },
});
const errors = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  404: { description: "Status page or subscription not found", content: json(error) },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Subscriber administration"],
    description: "Requires an organization owner or admin.",
    ...options,
  });
const body = (schema: Parameters<typeof resolver>[0]) => ({
  required: true,
  content: json(schema),
});
const unsupported = { description: "Unsupported content type", content: json(error) };
const conflict = {
  description: "Subscription already confirmed or channel unavailable",
  content: json(error),
};
const limited = { description: "Confirmation rate limit or cooldown", content: json(error) };
const unavailable = { description: "Could not queue confirmation", content: json(error) };
const size = (limit: number) => ({
  description: `Request body exceeds ${limit} KiB`,
  content: { "text/plain": { schema: { type: "string" as const } } },
});
const queued = {
  description: "Confirmation queued",
  content: json(z.object({ result: z.literal("queued") })),
};

export const listSubscribersDoc = route({
  operationId: "listSubscribers",
  summary: "List subscribers",
  parameters: [...base, ...["limit", "cursor", "state", "channel", "search"].map(query)],
  responses: {
    200: {
      description: "Subscribers",
      content: json(z.object({ data: z.array(subscriber), nextCursor: z.string().nullable() })),
    },
    ...errors,
  },
});
export const exportSubscribersDoc = route({
  operationId: "exportSubscribers",
  summary: "Export email subscribers as CSV",
  parameters: base,
  responses: {
    200: {
      description: "CSV export",
      content: { "text/csv": { schema: { type: "string" } } },
      headers: { "Content-Disposition": { schema: { type: "string" } } },
    },
    ...errors,
  },
});
export const subscriberSummaryDoc = route({
  operationId: "getSubscriberSummary",
  summary: "Get subscriber counts",
  parameters: base,
  responses: {
    200: {
      description: "Counts by channel",
      content: json(
        z.object({
          channels: z.array(
            z.object({ channel: z.string(), total: z.int(), confirmed: z.int(), pending: z.int() }),
          ),
        }),
      ),
    },
    ...errors,
  },
});
export const importSubscribersDoc = route({
  operationId: "importSubscribers",
  summary: "Import email subscribers from CSV",
  parameters: base,
  requestBody: {
    required: true,
    description: "CSV with an email header and at most 100 rows.",
    content: { "text/csv": { schema: { type: "string" } } },
  },
  responses: {
    200: {
      description: "Results by row",
      content: json(z.object({ results: z.array(z.object({ row: z.int(), result: z.string() })) })),
    },
    ...errors,
    413: size(64),
    415: unsupported,
  },
});
export const bulkDeleteSubscribersDoc = route({
  operationId: "deleteSubscribers",
  summary: "Delete subscribers in bulk",
  parameters: base,
  requestBody: body(z.strictObject({ ids: z.array(z.uuid()).min(1).max(100) })),
  responses: {
    200: {
      description: "Removed and missing IDs",
      content: json(z.object({ removed: z.array(z.uuid()), notFound: z.array(z.uuid()) })),
    },
    ...errors,
    413: size(16),
    415: unsupported,
  },
});
export const createSubscriberDoc = route({
  operationId: "createSubscriber",
  summary: "Request an email subscription",
  parameters: base,
  requestBody: body(
    z.strictObject({
      channel: z.literal("email"),
      email: emailSchema,
      preferences: preferencesSchema.optional(),
    }),
  ),
  responses: {
    202: queued,
    ...errors,
    409: conflict,
    413: size(16),
    415: unsupported,
    429: limited,
    503: unavailable,
  },
});
export const getSubscriberDoc = route({
  operationId: "getSubscriber",
  summary: "Get a subscriber",
  parameters: item,
  responses: { 200: { description: "Subscriber", content: json(subscriber) }, ...errors },
});
export const setSubscriberPreferencesDoc = route({
  operationId: "updateSubscriberPreferences",
  summary: "Update subscriber preferences",
  parameters: item,
  requestBody: body(preferencesSchema),
  responses: {
    200: {
      description: "Preferences updated",
      content: json(z.object({ success: z.literal(true) })),
    },
    ...errors,
    413: size(16),
    415: unsupported,
  },
});
export const resendSubscriberConfirmationDoc = route({
  operationId: "resendSubscriberConfirmation",
  summary: "Resend a confirmation",
  parameters: item,
  responses: { 202: queued, ...errors, 409: conflict, 429: limited, 503: unavailable },
});
export const deleteSubscriberDoc = route({
  operationId: "deleteSubscriber",
  summary: "Delete a subscriber",
  parameters: item,
  responses: { 204: { description: "Subscriber deleted" }, ...errors },
});
