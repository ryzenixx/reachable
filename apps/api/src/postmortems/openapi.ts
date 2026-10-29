import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { publishPostmortemSchema, savePostmortemSchema } from "./validation";

const date = z.iso.datetime();
const postmortem = z.object({ id: z.uuid(), incidentId: z.uuid(), draft: z.string(), draftUpdatedBy: z.string().nullable(),
  publishedContent: z.string().nullable(), publishedAt: date.nullable(), publishedUpdatedAt: date.nullable(), createdAt: date, updatedAt: date });
const publication = z.object({ id: z.uuid(), postmortemId: z.uuid(), content: z.string(), actorId: z.string().nullable(), createdAt: date });
const error = z.object({ error: z.string() });
const json = (schema: Parameters<typeof resolver>[0]) => ({ "application/json": { schema: resolver(schema) } });
const path = (name: string, format?: string) => ({ name, in: "path" as const, required: true, schema: { type: "string" as const, ...(format && { format }) } });
const parameters = [path("organizationId"), path("statusPageId", "uuid"), path("incidentId", "uuid")];
const failures = { 400: { description: "Invalid request", content: json(error) }, 401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) }, 404: { description: "Incident or postmortem not found", content: json(error) },
  413: { description: "Request body exceeds 256 KiB", content: { "text/plain": { schema: { type: "string" as const } } } } };
const route = (options: Parameters<typeof describeRoute>[0]) => describeRoute({ tags: ["Postmortems"], parameters,
  description: "Requires an organization owner or admin.", ...options });
const body = (schema: Parameters<typeof resolver>[0]) => ({ required: true, content: json(schema) });
const conflict = { description: "Incident is not resolved or draft is empty", content: json(error) };
const unsupported = { description: "Expected application/json", content: json(error) };

export const getPostmortemDoc = route({ operationId: "getPostmortem", summary: "Get a postmortem", responses: { 200: { description: "Postmortem", content: json(postmortem) }, ...failures } });
export const listPublicationsDoc = route({ operationId: "listPostmortemPublications", summary: "List postmortem publications", responses: { 200: { description: "Publications", content: json(z.array(publication)) }, ...failures } });
export const savePostmortemDoc = route({ operationId: "savePostmortem", summary: "Save a postmortem draft", requestBody: body(savePostmortemSchema),
  responses: { 200: { description: "Saved postmortem", content: json(postmortem) }, ...failures, 409: conflict, 415: unsupported } });
export const publishPostmortemDoc = route({ operationId: "publishPostmortem", summary: "Publish a postmortem", requestBody: body(publishPostmortemSchema),
  responses: { 200: { description: "Published postmortem", content: json(postmortem) }, ...failures, 409: conflict, 415: unsupported } });
