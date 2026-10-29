import { jsonContent as json } from "../http/openapi";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { componentStatus } from "../db/schema/component";
import { createComponentSchema, updateComponentSchema } from "./validation";

export const componentResponse = z.object({
  id: z.uuid(),
  statusPageId: z.uuid(),
  groupId: z.uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum([...componentStatus.enumValues, "unknown"]),
  manualStatus: z.enum(componentStatus.enumValues),
  position: z.number().int(),
  createdAt: z.iso.datetime(),
});
const component = componentResponse;
const error = z.object({ error: z.string() });
const path = (name: string, format?: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, ...(format && { format }) },
});
const base = [path("organizationId"), path("statusPageId", "uuid")];
const failures = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  404: { description: "Status page or component not found", content: json(error) },
  413: {
    description: "Request body exceeds 256 KiB",
    content: { "text/plain": { schema: { type: "string" as const } } },
  },
};
const unsupported = { description: "Expected application/json", content: json(error) };
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Components"],
    description: "Requires a signed-in organization member. Changes require an owner or admin.",
    ...options,
  });

export const listComponentsDoc = route({
  operationId: "listComponents",
  summary: "List components",
  parameters: base,
  responses: { 200: { description: "Components", content: json(z.array(component)) }, ...failures },
});
export const createComponentDoc = route({
  operationId: "createComponent",
  summary: "Create a component",
  parameters: base,
  requestBody: { required: true, content: json(createComponentSchema) },
  responses: {
    201: { description: "Created component", content: json(component) },
    ...failures,
    415: unsupported,
  },
});
export const updateComponentDoc = route({
  operationId: "updateComponent",
  summary: "Update a component",
  parameters: [...base, path("componentId", "uuid")],
  requestBody: {
    required: true,
    description: "At least one field is required.",
    content: json(updateComponentSchema),
  },
  responses: {
    200: { description: "Updated component", content: json(component) },
    ...failures,
    415: unsupported,
  },
});
export const deleteComponentDoc = route({
  operationId: "deleteComponent",
  summary: "Delete a component",
  parameters: [...base, path("componentId", "uuid")],
  responses: {
    204: { description: "Component deleted" },
    ...failures,
    409: {
      description: "Component is linked to an incident, maintenance or template",
      content: json(error),
    },
  },
});
