import { jsonContent as json } from "../http/openapi";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { createGroupSchema, updateGroupSchema } from "./validation";

const group = z.object({
  id: z.uuid(),
  statusPageId: z.uuid(),
  name: z.string(),
  position: z.int(),
  createdAt: z.iso.datetime(),
});
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
  404: { description: "Status page or group not found", content: json(error) },
  413: {
    description: "Request body exceeds 256 KiB",
    content: { "text/plain": { schema: { type: "string" as const } } },
  },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["Component groups"],
    description: "Requires a signed-in organization member. Changes require an owner or admin.",
    ...options,
  });
const unsupported = { description: "Expected application/json", content: json(error) };

export const listGroupsDoc = route({
  operationId: "listComponentGroups",
  summary: "List component groups",
  parameters: base,
  responses: {
    200: { description: "Component groups", content: json(z.array(group)) },
    ...failures,
  },
});
export const createGroupDoc = route({
  operationId: "createComponentGroup",
  summary: "Create a component group",
  parameters: base,
  requestBody: { required: true, content: json(createGroupSchema) },
  responses: {
    201: { description: "Created group", content: json(group) },
    ...failures,
    415: unsupported,
  },
});
export const updateGroupDoc = route({
  operationId: "updateComponentGroup",
  summary: "Update a component group",
  parameters: [...base, path("groupId", "uuid")],
  requestBody: {
    required: true,
    description: "At least one field is required.",
    content: json(updateGroupSchema),
  },
  responses: {
    200: { description: "Updated group", content: json(group) },
    ...failures,
    415: unsupported,
  },
});
export const deleteGroupDoc = route({
  operationId: "deleteComponentGroup",
  summary: "Delete a component group",
  parameters: [...base, path("groupId", "uuid")],
  description: "Requires an organization owner or admin. Components in the group become ungrouped.",
  responses: { 204: { description: "Group deleted" }, ...failures },
});
