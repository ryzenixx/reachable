import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";

const statuses = ["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance", "unknown", "untracked"] as const;
const durations = z.object(Object.fromEntries(statuses.map((status) => [status, z.number()])) as Record<(typeof statuses)[number], z.ZodNumber>);
const availability = z.object({ eligibleDurationMs: z.number(), lowerBoundPercent: z.number().nullable(), upperBoundPercent: z.number().nullable() });
const history = z.object({
  component: z.object({ id: z.uuid(), name: z.string() }), from: z.iso.datetime(), to: z.iso.datetime(),
  trackingStartedAt: z.iso.datetime().nullable(), timezone: z.literal("UTC"), basis: z.literal("declared_status"),
  durationsMs: durations, availability,
  days: z.array(z.object({ date: z.iso.date(), durationsMs: durations, availability })),
});
const changes = z.object({
  from: z.iso.datetime(), to: z.iso.datetime(),
  data: z.array(z.object({ id: z.uuid(), status: z.enum(statuses.slice(0, -1) as [string, ...string[]]),
    source: z.enum(["baseline", "manual", "incident", "maintenance"]), sourceId: z.uuid().nullable(), occurredAt: z.iso.datetime() })),
  nextCursor: z.string().nullable(),
});
const error = z.object({ error: z.string() });
const json = (schema: Parameters<typeof resolver>[0]) => ({ "application/json": { schema: resolver(schema) } });
const path = (name: string, format?: string) => ({ name, in: "path" as const, required: true, schema: { type: "string" as const, ...(format && { format }) } });
const query = (name: string, description: string) => ({ name, in: "query" as const, description, schema: { type: "string" as const } });
const range = [query("from", "Start of range, inclusive. Defaults to 90 days before to."), query("to", "End of range, exclusive. Defaults to now. Range must be at most 366 days and cannot end in the future.")];
const paging = [query("limit", "Number of changes, from 1 to 100. Defaults to 20."), query("cursor", "Cursor returned by a previous request."), query("state", "Only all is supported.")];

export function historyDoc(publicRoute: boolean, listChanges: boolean) {
  const scope = publicRoute ? [path("slug")] : [path("organizationId"), path("statusPageId", "uuid")];
  return describeRoute({
    operationId: `${publicRoute ? "getPublic" : "get"}Component${listChanges ? "HistoryChanges" : "History"}`,
    summary: listChanges ? "List component status changes" : "Get component status history",
    description: publicRoute ? "Available for published status pages." : "Requires a signed-in organization member.",
    tags: [publicRoute ? "Public status pages" : "Components"],
    parameters: [...scope, path("componentId", "uuid"), ...range, ...(listChanges ? paging : [])],
    responses: {
      200: { description: "Component history", content: json(listChanges ? changes : history) },
      400: { description: "Invalid component ID or query parameters", content: json(error) },
      ...(publicRoute ? { 308: { description: "Redirect to the current slug", headers: { Location: { schema: { type: "string" as const } } } } } : {
        401: { description: "Authentication required", content: json(error) },
        403: { description: "Insufficient organization permissions", content: json(error) },
      }),
      404: { description: "Status page or component not found", content: json(error) },
    },
  });
}
