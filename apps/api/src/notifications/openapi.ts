import { jsonContent as json } from "../http/openapi";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { deliveryStatus } from "../db/schema/notification";

const date = z.iso.datetime();
const base = {
  id: z.uuid(),
  status: z.enum(deliveryStatus.enumValues),
  attempts: z.int(),
  nextAttemptAt: date,
  createdAt: date,
  processedAt: date.nullable(),
};
const failure = { lastFailureCode: z.string().nullable(), lastResponseCode: z.int().nullable() };
const recipient = { channel: z.string(), destination: z.string() };
const delivery = z.object({
  ...base,
  ...failure,
  ...recipient,
  eventId: z.uuid(),
  cycleAttempts: z.int(),
  lastFailureAt: date.nullable(),
});
const confirmation = z.object({
  ...base,
  ...failure,
  ...recipient,
  subscriptionId: z.uuid(),
  reason: z.string().nullable(),
  lastFailureAt: date.nullable(),
  expiresAt: date,
});
const alert = z.object({
  ...base,
  ...failure,
  subscriptionId: z.uuid(),
  deliveryId: z.uuid(),
  failureCode: z.string(),
  responseCode: z.int().nullable(),
  cycleAttempts: z.int(),
  reason: z.string().nullable(),
  contactEmail: z.string(),
});
const error = json(z.object({ error: z.string() }));
const path = (name: string, format?: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, ...(format && { format }) },
});
const baseParams = [path("organizationId"), path("statusPageId", "uuid")];
const query = (name: string) => ({
  name,
  in: "query" as const,
  schema: { type: "string" as const },
});
const errors = {
  400: { description: "Invalid request", content: error },
  401: { description: "Authentication required", content: error },
  403: { description: "Insufficient permissions or forbidden origin", content: error },
  404: { description: "Status page or delivery not found", content: error },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Notification deliveries"],
    description: "Requires an organization owner or admin.",
    ...options,
  });
const paging = ["limit", "cursor", "state", "status"].map(query);
const paginated = (schema: Parameters<typeof resolver>[0]) =>
  z.object({ data: z.array(schema as z.ZodType), nextCursor: z.string().nullable() });

export const listConfirmationsDoc = route({
  operationId: "listConfirmationDeliveries",
  summary: "List subscription confirmation deliveries",
  parameters: [...baseParams, ...paging],
  responses: {
    200: { description: "Confirmation deliveries", content: json(paginated(confirmation)) },
    ...errors,
  },
});
export const listNotificationDeliveriesDoc = route({
  operationId: "listNotificationDeliveries",
  summary: "List notification deliveries",
  parameters: [...baseParams, ...paging],
  responses: {
    200: {
      description: "Notification deliveries",
      content: json(paginated(delivery.extend({ subscriptionId: z.uuid() }))),
    },
    ...errors,
  },
});
export const listLegacyDeliveriesDoc = route({
  operationId: "listRecentNotificationDeliveries",
  summary: "List recent notification deliveries",
  parameters: [...baseParams, query("status")],
  responses: {
    200: { description: "Up to 100 deliveries", content: json(z.array(delivery)) },
    ...errors,
  },
});
export const listWebhookAlertsDoc = route({
  operationId: "listWebhookFailureAlerts",
  summary: "List webhook failure alerts",
  parameters: [...baseParams, ...paging],
  responses: { 200: { description: "Webhook alerts", content: json(paginated(alert)) }, ...errors },
});
export function retryDeliveryDoc(alert: boolean) {
  return route({
    operationId: alert ? "retryWebhookFailureAlert" : "retryNotificationDelivery",
    summary: alert ? "Retry a webhook failure alert" : "Retry a notification delivery",
    parameters: [...baseParams, path(alert ? "alertId" : "deliveryId", "uuid")],
    responses: {
      202: {
        description: "Queued for retry",
        content: json(z.object({ status: z.literal("pending") })),
      },
      ...errors,
      409: { description: "Delivery cannot be retried", content: error },
    },
  });
}
