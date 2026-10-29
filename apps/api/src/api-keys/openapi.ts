import { jsonContent as json } from "../http/openapi";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { createApiKeySchema, permissionsSchema } from "./validation";

const error = z.object({ error: z.string() });
const organization = {
  name: "organizationId",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};
const keyId = {
  name: "keyId",
  in: "path" as const,
  required: true,
  schema: { type: "string" as const },
};
const query = (name: string) => ({
  name,
  in: "query" as const,
  schema: { type: "integer" as const },
});
const errors = {
  400: { description: "Invalid request", content: json(error) },
  401: { description: "Authentication required", content: json(error) },
  403: { description: "Insufficient permissions or forbidden origin", content: json(error) },
  404: { description: "Page or API key not found", content: json(error) },
};
const route = (options: Parameters<typeof describeRoute>[0]) =>
  describeRoute({
    tags: ["API keys"],
    description: "Requires an organization owner or admin.",
    ...options,
  });
const key = z.object({
  id: z.string(),
  name: z.string().nullable(),
  start: z.string().nullable(),
  enabled: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime().nullable(),
  permissions: z.unknown(),
  metadata: z.unknown(),
});

export const listApiKeysDoc = route({
  operationId: "listApiKeys",
  summary: "List API keys",
  parameters: [organization, query("limit"), query("offset")],
  responses: {
    200: {
      description: "API keys",
      content: json(z.object({ data: z.array(key), nextOffset: z.int().nullable() })),
    },
    ...errors,
  },
});
export const createApiKeyDoc = route({
  operationId: "createApiKey",
  summary: "Create a page-scoped API key",
  parameters: [organization],
  description:
    "Requires an organization owner or admin. The secret key is only returned on creation.",
  requestBody: { required: true, content: json(createApiKeySchema) },
  responses: {
    201: {
      description: "Created API key",
      content: json(
        z.object({
          id: z.string(),
          name: z.string().nullable(),
          key: z.string(),
          start: z.string().nullable(),
          expiresAt: z.iso.datetime().nullable(),
          pageId: z.uuid(),
          permissions: permissionsSchema,
        }),
      ),
    },
    ...errors,
    413: {
      description: "Request body exceeds 16 KiB",
      content: { "text/plain": { schema: { type: "string" } } },
    },
    415: { description: "Expected application/json", content: json(error) },
  },
});
export const deleteApiKeyDoc = route({
  operationId: "revokeApiKey",
  summary: "Revoke an API key",
  parameters: [organization, keyId],
  responses: { 204: { description: "API key revoked" }, ...errors },
});
