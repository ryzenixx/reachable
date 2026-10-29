import { jsonContent as json } from "../http/openapi";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { maintenanceStatus } from "../db/schema/maintenance";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";
import { createMaintenanceSchema, createMaintenanceUpdateSchema } from "./validation";

const date = z.iso.datetime();
const status = z.enum(maintenanceStatus.enumValues);
export const maintenanceResponse = z.object({
  id: z.uuid(),
  statusPageId: z.uuid(),
  title: z.string(),
  status,
  startsAt: date,
  endsAt: date,
  autoStart: z.boolean(),
  autoComplete: z.boolean(),
  notifyOnAutoTransition: z.boolean(),
  reminderMinutes: z.int().nullable(),
  createdAt: date,
  updatedAt: date,
});
export const maintenanceUpdateResponse = z.object({
  id: z.uuid(),
  maintenanceId: z.uuid(),
  status,
  message: z.string(),
  automated: z.boolean(),
  startsAt: date,
  endsAt: date,
  createdAt: date,
});
const maintenance = maintenanceResponse;
const update = maintenanceUpdateResponse;
const linkedComponent = z.object({ id: z.uuid(), name: z.string() });
const listed = z.object({
  id: z.uuid(),
  title: z.string(),
  status,
  startsAt: date,
  endsAt: date,
  createdAt: date,
  updatedAt: date,
  updates: z.array(
    update.omit({ maintenanceId: true }).extend({ components: z.array(linkedComponent) }),
  ),
  components: z.array(linkedComponent),
});
const adminListed = listed.extend({
  autoStart: z.boolean(),
  autoComplete: z.boolean(),
  notifyOnAutoTransition: z.boolean(),
  reminderMinutes: z.int().nullable(),
  autoStartMissed: z.boolean(),
});
const edits = z.array(
  z.object({
    id: z.uuid(),
    maintenanceId: z.uuid(),
    updateId: z.uuid().nullable(),
    field: z.enum(["title", "message"]),
    previousValue: z.string(),
    newValue: z.string(),
    actorId: z.string().nullable(),
    createdAt: date,
  }),
);
const error = z.object({ error: z.string() });
const path = (name: string, format?: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, ...(format && { format }) },
});
const base = [path("organizationId"), path("statusPageId", "uuid")];
const item = [...base, path("maintenanceId", "uuid")];
const failures = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  404: { description: "Status page or maintenance not found", content: json(error) },
  413: {
    description: "Request body exceeds 256 KiB",
    content: { "text/plain": { schema: { type: "string" as const } } },
  },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Maintenances"],
    description:
      "Requires a signed-in organization member. Changes and edit history require an owner or admin.",
    ...options,
  });
const unsupported = { description: "Expected application/json", content: json(error) };
const body = (schema: Parameters<typeof resolver>[0]) => ({
  required: true,
  content: json(schema),
});
const query = (name: string, schema: { type: "string"; enum?: string[] }) => ({
  name,
  in: "query" as const,
  schema,
});
const listParameters = [
  query("limit", { type: "string" }),
  query("state", { type: "string", enum: ["all", "scheduled", "active", "past"] }),
  query("cursor", { type: "string" }),
];
const paginated = (schema: typeof listed) =>
  z.object({ data: z.array(schema), nextCursor: z.string().nullable() });
export const maintenanceListResponse = paginated(adminListed);

export const listMaintenancesDoc = route({
  operationId: "listMaintenances",
  summary: "List maintenances",
  parameters: [...base, ...listParameters],
  responses: {
    200: { description: "Maintenances", content: json(paginated(adminListed)) },
    ...failures,
  },
});
export const listPublicMaintenancesDoc = describeRoute({
  operationId: "listPublicMaintenances",
  summary: "List maintenances on a published page",
  tags: ["Public status pages"],
  parameters: [path("slug"), ...listParameters],
  responses: {
    200: { description: "Maintenances", content: json(paginated(listed)) },
    308: {
      description: "Redirect to the current slug",
      headers: { Location: { schema: { type: "string" } } },
    },
    400: { description: "Invalid query parameters", content: json(error) },
    404: { description: "Published page not found", content: json(error) },
  },
});
export const listMaintenanceEditsDoc = route({
  operationId: "listMaintenanceEdits",
  summary: "List maintenance corrections",
  parameters: item,
  responses: { 200: { description: "Corrections", content: json(edits) }, ...failures },
});
export const editMaintenanceTitleDoc = route({
  operationId: "editMaintenanceTitle",
  summary: "Correct a maintenance title",
  parameters: item,
  requestBody: body(editTitleSchema),
  responses: {
    200: { description: "Maintenance", content: json(maintenance) },
    ...failures,
    415: unsupported,
  },
});
export const editMaintenanceMessageDoc = route({
  operationId: "editMaintenanceMessage",
  summary: "Correct a maintenance update",
  parameters: [...item, path("updateId", "uuid")],
  requestBody: body(editMessageSchema),
  responses: {
    200: { description: "Maintenance update", content: json(update) },
    ...failures,
    415: unsupported,
  },
});
export const createMaintenanceDoc = route({
  operationId: "createMaintenance",
  summary: "Schedule a maintenance",
  parameters: base,
  requestBody: body(createMaintenanceSchema),
  responses: {
    201: { description: "Created maintenance", content: json(maintenance) },
    ...failures,
    415: unsupported,
  },
});
export const createMaintenanceUpdateDoc = route({
  operationId: "createMaintenanceUpdate",
  summary: "Add a maintenance update",
  parameters: item,
  requestBody: body(createMaintenanceUpdateSchema),
  responses: {
    201: { description: "Created update", content: json(update) },
    ...failures,
    409: { description: "Invalid maintenance status transition", content: json(error) },
    415: unsupported,
  },
});
