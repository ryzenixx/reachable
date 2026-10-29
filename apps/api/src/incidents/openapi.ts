import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { incidentStatus } from "../db/schema/incident";
import { componentStatus } from "../db/schema/component";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { createHistoricalIncidentSchema, createIncidentSchema, createIncidentUpdateSchema } from "./validation";

const timestamp = z.iso.datetime();
const status = z.enum(incidentStatus.enumValues);
export const incidentResponse = z.object({ id: z.uuid(), statusPageId: z.uuid(), title: z.string(), status, occurredAt: timestamp.nullable(), createdAt: timestamp, updatedAt: timestamp });
export const incidentUpdateResponse = z.object({ id: z.uuid(), incidentId: z.uuid(), status, message: z.string(), createdAt: timestamp });
const incident = incidentResponse;
const update = incidentUpdateResponse;
const affectedComponent = z.object({ id: z.uuid(), name: z.string(), impact: z.enum(componentStatus.enumValues).nullable() });
const listedIncident = z.object({ id: z.uuid(), title: z.string(), status, createdAt: timestamp, updatedAt: timestamp, occurredAt: timestamp.nullable(),
  postmortem: z.object({ content: z.string().nullable(), publishedAt: timestamp.nullable(), updatedAt: timestamp.nullable() }).nullable(),
  updates: z.array(update.omit({ incidentId: true }).extend({ components: z.array(affectedComponent).nullable() })),
  components: z.array(affectedComponent),
});
const edits = z.array(z.object({ id: z.uuid(), incidentId: z.uuid(), updateId: z.uuid().nullable(), field: z.enum(["title", "message"]),
  previousValue: z.string(), newValue: z.string(), actorId: z.string().nullable(), createdAt: timestamp }));
const error = z.object({ error: z.string() });
const json = (schema: Parameters<typeof resolver>[0]) => ({ "application/json": { schema: resolver(schema) } });
const path = (name: string, format?: string) => ({ name, in: "path" as const, required: true, schema: { type: "string" as const, ...(format && { format }) } });
const base = [path("organizationId"), path("statusPageId", "uuid")];
const failures = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  404: { description: "Status page or incident not found", content: json(error) },
  413: { description: "Request body exceeds 256 KiB", content: { "text/plain": { schema: { type: "string" as const } } } },
};
const route = (options: Parameters<typeof describeRoute>[0]) => describeRoute({ tags: ["Incidents"],
  description: "Requires a signed-in organization member. Changes and edit history require an owner or admin.", ...options });
const unsupported = { description: "Expected application/json", content: json(error) };
const body = (schema: Parameters<typeof resolver>[0]) => ({ required: true, content: json(schema) });
const incidentPath = [...base, path("incidentId", "uuid")];
const query = (name: string, schema: { type: "string"; enum?: string[] }) => ({ name, in: "query" as const, schema });
const listParameters = [query("limit", { type: "string" }), query("state", { type: "string", enum: ["all", "active", "past"] }), query("cursor", { type: "string" })];
export const incidentListResponse = z.object({ data: z.array(listedIncident), nextCursor: z.string().nullable() });
const listResponse = incidentListResponse;

export const listIncidentsDoc = route({ operationId: "listIncidents", summary: "List incidents", parameters: [...base, ...listParameters],
  responses: { 200: { description: "Incidents", content: json(listResponse) }, ...failures } });
export const listPublicIncidentsDoc = describeRoute({ operationId: "listPublicIncidents", summary: "List incidents on a published page", tags: ["Public status pages"],
  parameters: [path("slug"), ...listParameters], responses: { 200: { description: "Incidents", content: json(listResponse) },
    308: { description: "Redirect to the current slug", headers: { Location: { schema: { type: "string" } } } },
    400: { description: "Invalid query parameters", content: json(error) }, 404: { description: "Published page not found", content: json(error) } } });
export const listIncidentEditsDoc = route({ operationId: "listIncidentEdits", summary: "List incident corrections", parameters: incidentPath,
  responses: { 200: { description: "Corrections", content: json(edits) }, ...failures } });
export const editIncidentTitleDoc = route({ operationId: "editIncidentTitle", summary: "Correct an incident title", parameters: incidentPath, requestBody: body(editTitleSchema),
  responses: { 200: { description: "Incident", content: json(incident) }, ...failures, 415: unsupported } });
export const editIncidentMessageDoc = route({ operationId: "editIncidentMessage", summary: "Correct an incident update", parameters: [...incidentPath, path("updateId", "uuid")], requestBody: body(editMessageSchema),
  responses: { 200: { description: "Incident update", content: json(update) }, ...failures, 415: unsupported } });
export const createIncidentDoc = route({ operationId: "createIncident", summary: "Create an incident", parameters: base, requestBody: body(createIncidentSchema),
  responses: { 201: { description: "Created incident", content: json(incident) }, ...failures, 415: unsupported } });
export const createHistoricalIncidentDoc = route({ operationId: "createHistoricalIncident", summary: "Create a historical incident", parameters: base, requestBody: body(createHistoricalIncidentSchema),
  responses: { 201: { description: "Created historical incident", content: json(incident) }, ...failures, 415: unsupported } });
export const createIncidentUpdateDoc = route({ operationId: "createIncidentUpdate", summary: "Add an incident update", parameters: incidentPath, requestBody: body(createIncidentUpdateSchema),
  responses: { 201: { description: "Created update", content: json(update) }, ...failures,
    409: { description: "Historical incident cannot be reopened", content: json(error) }, 415: unsupported } });
