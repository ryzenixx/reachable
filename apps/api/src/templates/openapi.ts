import { jsonContent as json } from "../http/openapi";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { componentStatus } from "../db/schema/component";
import { templateKinds, templateSchema } from "./validation";

const template = z.object({
  id: z.uuid(),
  kind: z.enum(templateKinds),
  name: z.string(),
  defaults: z.object({
    title: z.string().optional(),
    status: z.string().optional(),
    message: z.string(),
    notifySubscribers: z.boolean(),
    components: z
      .array(
        z.object({ componentId: z.uuid(), status: z.enum(componentStatus.enumValues).nullable() }),
      )
      .optional(),
    componentIds: z.array(z.uuid()).optional(),
    durationMinutes: z.int().optional(),
    autoStart: z.boolean().optional(),
    autoComplete: z.boolean().optional(),
    notifyOnAutoTransition: z.boolean().optional(),
    reminderMinutes: z.int().nullable().optional(),
  }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const error = json(z.object({ error: z.string() }));
const path = (name: string, format?: string) => ({
  name,
  in: "path" as const,
  required: true,
  schema: { type: "string" as const, ...(format && { format }) },
});
const base = [path("organizationId"), path("statusPageId", "uuid")];
const item = [...base, path("templateId", "uuid")];
const errors = {
  400: { description: "Invalid request", content: error },
  401: { description: "Authentication required", content: error },
  403: { description: "Insufficient permissions or forbidden origin", content: error },
  404: { description: "Status page or template not found", content: error },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Communication templates"],
    description: "Requires a signed-in organization member. Changes require an owner or admin.",
    ...options,
  });
const body = { required: true, content: json(templateSchema) };
const writeErrors = {
  413: {
    description: "Request body exceeds 64 KiB",
    content: { "text/plain": { schema: { type: "string" as const } } },
  },
  415: { description: "Expected application/json", content: error },
};
const query = (name: string) => ({
  name,
  in: "query" as const,
  schema: { type: "string" as const },
});

export const listTemplatesDoc = route({
  operationId: "listCommunicationTemplates",
  summary: "List communication templates",
  parameters: [...base, ...["limit", "cursor", "state", "kind"].map(query)],
  responses: {
    200: {
      description: "Templates",
      content: json(z.object({ data: z.array(template), nextCursor: z.string().nullable() })),
    },
    ...errors,
  },
});
export const getTemplateDoc = route({
  operationId: "getCommunicationTemplate",
  summary: "Get a communication template",
  parameters: item,
  responses: { 200: { description: "Template", content: json(template) }, ...errors },
});
export const createTemplateDoc = route({
  operationId: "createCommunicationTemplate",
  summary: "Create a communication template",
  parameters: base,
  requestBody: body,
  responses: {
    201: { description: "Created template", content: json(template) },
    ...errors,
    ...writeErrors,
  },
});
export const updateTemplateDoc = route({
  operationId: "updateCommunicationTemplate",
  summary: "Replace a communication template",
  parameters: item,
  requestBody: body,
  responses: {
    200: { description: "Updated template", content: json(template) },
    ...errors,
    ...writeErrors,
  },
});
export const deleteTemplateDoc = route({
  operationId: "deleteCommunicationTemplate",
  summary: "Delete a communication template",
  parameters: item,
  responses: { 204: { description: "Template deleted" }, ...errors },
});
