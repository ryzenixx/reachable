import { resolver } from "hono-openapi";

export function jsonContent(schema: Parameters<typeof resolver>[0]) {
  return { "application/json": { schema: resolver(schema) } };
}
