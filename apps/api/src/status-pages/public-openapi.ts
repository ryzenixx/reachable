import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { componentStatus } from "../db/schema/component";
import { publicBrandingSettings } from "../branding/openapi";

const statuses = z.enum([...componentStatus.enumValues, "unknown"]);
const page = z.object({ name: z.string(), slug: z.string(), feeds: z.object({ rss: z.string(), atom: z.string() }).nullable(),
  branding: publicBrandingSettings.extend({ assets: z.record(z.string(), z.string()) }),
  summary: z.object({ status: statuses, hasUnknownImpact: z.boolean(), hasActiveIncidents: z.boolean(), hasActiveMaintenances: z.boolean() }),
  groups: z.array(z.object({ id: z.uuid(), name: z.string(), position: z.int() })),
  components: z.array(z.object({ id: z.uuid(), name: z.string(), description: z.string().nullable(), status: statuses, groupId: z.uuid().nullable() })) });

export const getPublicStatusPageDoc = describeRoute({ operationId: "getPublicStatusPage", summary: "Get a published status page", tags: ["Public status pages"],
  parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
  responses: { 200: { description: "Published status page", content: { "application/json": { schema: resolver(page) } } },
    308: { description: "Redirect to the current slug", headers: { Location: { schema: { type: "string" } } } },
    404: { description: "Published page not found", content: { "application/json": { schema: resolver(z.object({ error: z.string() })) } } } } });
