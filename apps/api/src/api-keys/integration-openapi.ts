import { jsonContent as json } from "../http/openapi";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { componentStatus } from "../db/schema/component";
import { componentResponse } from "../components/openapi";
import {
  incidentListResponse,
  incidentResponse,
  incidentUpdateResponse,
} from "../incidents/openapi";
import {
  maintenanceListResponse,
  maintenanceResponse,
  maintenanceUpdateResponse,
} from "../maintenances/openapi";
import {
  createHistoricalIncidentSchema,
  createIncidentSchema,
  createIncidentUpdateSchema,
} from "../incidents/validation";
import { createMaintenanceSchema, createMaintenanceUpdateSchema } from "../maintenances/validation";
import { editMessageSchema, editTitleSchema } from "../content-edits/validation";

const error = z.object({ error: z.string() });
const path = (name: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, format: "uuid" },
});
const base = [path("pageId")];
const failures = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Invalid API key", content: json(error) },
  403: { description: "API key does not grant access to this page", content: json(error) },
  404: { description: "Resource not found", content: json(error) },
  413: {
    description: "Request body exceeds 32 KiB",
    content: { "text/plain": { schema: { type: "string" as const } } },
  },
  429: { description: "API key rate limit exceeded", content: json(error) },
};
const unsupported = { description: "Expected application/json", content: json(error) };
const conflict = { description: "Invalid status transition", content: json(error) };
const route = (resource: string, action: string, options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Integrations"],
    security: [{ integrationKey: [] }],
    description: `Requires an API key with ${resource}:${action} permission for the page.`,
    ...options,
  });
const body = (schema: Parameters<typeof resolver>[0]) => ({
  required: true,
  content: json(schema),
});
const query = (name: string, schema: { type: "string"; enum?: string[] }) => ({
  name,
  in: "query" as const,
  schema,
});
const paging = (states: string[]) => [
  query("limit", { type: "string" }),
  query("state", { type: "string", enum: states }),
  query("cursor", { type: "string" }),
];

export const integrationComponentsDoc = route("components", "read", {
  operationId: "integrationListComponents",
  summary: "List components",
  parameters: base,
  responses: {
    200: { description: "Components", content: json(z.array(componentResponse)) },
    ...failures,
  },
});
export const integrationComponentStatusDoc = route("components", "write", {
  operationId: "integrationUpdateComponentStatus",
  summary: "Update component status",
  parameters: [...base, path("componentId")],
  requestBody: body(z.strictObject({ status: z.enum(componentStatus.enumValues) })),
  responses: {
    200: { description: "Component", content: json(componentResponse) },
    ...failures,
    415: unsupported,
  },
});

export function integrationListDoc(resource: "incidents" | "maintenances") {
  return route(resource, "read", {
    operationId:
      resource === "incidents" ? "integrationListIncidents" : "integrationListMaintenances",
    summary: `List ${resource}`,
    parameters: [
      ...base,
      ...paging(
        resource === "incidents"
          ? ["all", "active", "past"]
          : ["all", "scheduled", "active", "past"],
      ),
    ],
    responses: {
      200: {
        description: resource,
        content: json(resource === "incidents" ? incidentListResponse : maintenanceListResponse),
      },
      ...failures,
    },
  });
}
export function integrationCreateDoc(resource: "incidents" | "maintenances", historical = false) {
  const schema =
    resource === "incidents"
      ? historical
        ? createHistoricalIncidentSchema
        : createIncidentSchema
      : createMaintenanceSchema;
  return route(resource, "write", {
    operationId: historical
      ? "integrationCreateHistoricalIncident"
      : resource === "incidents"
        ? "integrationCreateIncident"
        : "integrationCreateMaintenance",
    summary: historical
      ? "Create a historical incident"
      : `Create ${resource === "incidents" ? "an incident" : "a maintenance"}`,
    parameters: base,
    requestBody: body(schema),
    responses: {
      201: {
        description: "Created resource",
        content: json(resource === "incidents" ? incidentResponse : maintenanceResponse),
      },
      ...failures,
      415: unsupported,
    },
  });
}
export function integrationUpdateDoc(resource: "incidents" | "maintenances") {
  return route(resource, "write", {
    operationId:
      resource === "incidents"
        ? "integrationCreateIncidentUpdate"
        : "integrationCreateMaintenanceUpdate",
    summary: `Add ${resource === "incidents" ? "an incident" : "a maintenance"} update`,
    parameters: [...base, path(resource === "incidents" ? "incidentId" : "maintenanceId")],
    requestBody: body(
      resource === "incidents" ? createIncidentUpdateSchema : createMaintenanceUpdateSchema,
    ),
    responses: {
      201: {
        description: "Created update",
        content: json(
          resource === "incidents" ? incidentUpdateResponse : maintenanceUpdateResponse,
        ),
      },
      ...failures,
      409: conflict,
      415: unsupported,
    },
  });
}
export function integrationEditDoc(resource: "incidents" | "maintenances", message: boolean) {
  const name = resource === "incidents" ? "Incident" : "Maintenance";
  return route(resource, "write", {
    operationId: `integrationEdit${name}${message ? "Message" : "Title"}`,
    summary: `Correct ${name.toLowerCase()} ${message ? "update" : "title"}`,
    parameters: [...base, path("id"), ...(message ? [path("updateId")] : [])],
    requestBody: body(message ? editMessageSchema : editTitleSchema),
    responses: {
      200: {
        description: "Updated resource",
        content: json(
          resource === "incidents"
            ? message
              ? incidentUpdateResponse
              : incidentResponse
            : message
              ? maintenanceUpdateResponse
              : maintenanceResponse,
        ),
      },
      ...failures,
      415: unsupported,
    },
  });
}
