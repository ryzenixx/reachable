import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { createStatusPageSchema, feedSettingsSchema, publicationSchema, updateStatusPageSchema } from "./validation";

const page = z.object({
  id: z.uuid(), organizationId: z.string(), name: z.string(), slug: z.string(),
  published: z.boolean(), feedEnabled: z.boolean(), createdAt: z.iso.datetime(),
});
const error = z.object({ error: z.string() });
const json = (schema: Parameters<typeof resolver>[0]) => ({ "application/json": { schema: resolver(schema) } });
const organization = { name: "organizationId", in: "path" as const, required: true, schema: { type: "string" as const } };
const pageId = { name: "statusPageId", in: "path" as const, required: true, schema: { type: "string" as const, format: "uuid" } };
const failures = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  413: { description: "Request body exceeds 256 KiB", content: { "text/plain": { schema: { type: "string" as const } } } },
};
const notFound = { description: "Status page not found", content: json(error) };
const conflict = { description: "Slug already in use", content: json(error) };
const mediaType = { description: "Expected application/json", content: json(error) };
const requestBody = (schema: Parameters<typeof resolver>[0]) => ({ required: true, content: json(schema) });
const route = (options: Parameters<typeof describeRoute>[0]) => describeRoute({
  tags: ["Status pages"],
  description: "Requires a signed-in organization member. Changes require an owner or admin.",
  ...options,
});

export const listPagesDoc = route({ operationId: "listStatusPages", summary: "List status pages", parameters: [organization],
  responses: { 200: { description: "Status pages", content: json(z.array(page)) }, ...failures } });
export const slugAvailabilityDoc = route({ operationId: "getStatusPageSlugAvailability", summary: "Check slug availability", parameters: [organization,
  { name: "slug", in: "query", required: true, schema: { type: "string", minLength: 1, maxLength: 63, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } }],
  responses: { 200: { description: "Availability", content: json(z.object({ available: z.boolean() })) }, ...failures } });
export const getPageDoc = route({ operationId: "getStatusPage", summary: "Get a status page", parameters: [organization, pageId],
  responses: { 200: { description: "Status page", content: json(page) }, ...failures, 404: notFound } });
export const createPageDoc = route({ operationId: "createStatusPage", summary: "Create a status page", parameters: [organization], requestBody: requestBody(createStatusPageSchema),
  responses: { 201: { description: "Created status page", content: json(page) }, ...failures, 409: conflict, 415: mediaType } });
export const updatePageDoc = route({ operationId: "updateStatusPage", summary: "Update a status page", parameters: [organization, pageId], requestBody: { ...requestBody(updateStatusPageSchema), description: "At least one field is required." },
  responses: { 200: { description: "Updated status page", content: json(page) }, ...failures, 404: notFound, 409: conflict, 415: mediaType } });
export const publicationDoc = route({ operationId: "setStatusPagePublication", summary: "Publish or unpublish a status page", parameters: [organization, pageId], requestBody: requestBody(publicationSchema),
  responses: { 200: { description: "Updated status page", content: json(page) }, ...failures, 404: notFound, 415: mediaType } });
export const feedDoc = route({ operationId: "setStatusPageFeed", summary: "Enable or disable status page feeds", parameters: [organization, pageId], requestBody: requestBody(feedSettingsSchema),
  responses: { 200: { description: "Feed settings", content: json(z.object({ enabled: z.boolean() })) }, ...failures, 404: notFound, 415: mediaType } });
