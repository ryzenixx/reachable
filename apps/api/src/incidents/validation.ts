import { z } from "zod";
import { incidentStatus } from "../db/schema/incident";
import { componentStatus } from "../db/schema/component";
import type { HistoryQuery } from "../history/pagination";

export const incidentHistoryStates = ["all", "active", "past"] as const;
export type IncidentHistoryQuery = HistoryQuery<(typeof incidentHistoryStates)[number]>;

const status = z.enum(incidentStatus.enumValues);
const message = z.string().trim().min(1).max(10000);
const impacts = z
  .array(
    z.strictObject({
      componentId: z.uuid(),
      status: z.enum(componentStatus.enumValues),
    }),
  )
  .max(100)
  .refine((entries) => new Set(entries.map((entry) => entry.componentId)).size === entries.length);

export const createIncidentSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  status,
  message,
  components: impacts,
  notifySubscribers: z.boolean().optional(),
});

export const createHistoricalIncidentSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  message,
  occurredAt: z.iso.datetime({ offset: true }).refine((value) => {
    const time = Date.parse(value);
    return (
      Number.isFinite(time) && time >= Date.parse("0001-01-01T00:00:00Z") && time <= Date.now()
    );
  }),
  components: impacts,
});

export const createIncidentUpdateSchema = z
  .strictObject({
    status,
    message,
    components: impacts.optional(),
    notifySubscribers: z.boolean().optional(),
    removedComponentIds: z
      .array(z.uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length)
      .optional(),
  })
  .refine((value) => {
    const removed = new Set(value.removedComponentIds);
    return !value.components?.some((entry) => removed.has(entry.componentId));
  });
export type CreateIncident = z.infer<typeof createIncidentSchema>;
export type CreateHistoricalIncident = z.infer<typeof createHistoricalIncidentSchema>;
export type CreateIncidentUpdate = z.infer<typeof createIncidentUpdateSchema>;
