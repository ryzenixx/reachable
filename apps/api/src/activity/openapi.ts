import { jsonContent as json } from "../http/openapi";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { deliveryStatus } from "../db/schema/notification";

const error = json(z.object({ error: z.string() }));
const path = {
  name: "organizationId",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};
const query = (name: string) => ({
  name,
  in: "query" as const,
  schema: { type: "string" as const },
});
const errors = {
  400: { description: "Invalid query parameters", content: error },
  401: { description: "Authentication required", content: error },
  403: { description: "Insufficient organization permissions", content: error },
  404: { description: "Status page not found", content: error },
};
const date = z.iso.datetime();
const activity = z.object({
  id: z.uuid(),
  statusPageId: z.uuid().nullable(),
  actorType: z.string(),
  actorId: z.string().nullable(),
  apiKeyId: z.string().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: date,
});
const invitationDelivery = z.object({
  id: z.uuid(),
  invitationId: z.string(),
  status: z.enum(deliveryStatus.enumValues),
  reason: z.string().nullable(),
  attempts: z.int(),
  nextAttemptAt: date,
  expiresAt: date,
  createdAt: date,
  processedAt: date.nullable(),
});
const page = (schema: z.ZodType) =>
  z.object({ data: z.array(schema), nextCursor: z.string().nullable() });

export const listActivityDoc = describeRoute({
  operationId: "listOrganizationActivity",
  summary: "List organization activity",
  tags: ["Activity"],
  description: "Requires an organization owner or admin.",
  parameters: [path, ...["limit", "cursor", "state", "statusPageId"].map(query)],
  responses: { 200: { description: "Activity", content: json(page(activity)) }, ...errors },
});
export const listInvitationDeliveriesDoc = describeRoute({
  operationId: "listInvitationDeliveries",
  summary: "List invitation email deliveries",
  tags: ["Notification deliveries"],
  description: "Requires an organization owner or admin.",
  parameters: [path, ...["limit", "cursor", "state", "status"].map(query)],
  responses: {
    200: { description: "Invitation deliveries", content: json(page(invitationDelivery)) },
    ...errors,
  },
});
