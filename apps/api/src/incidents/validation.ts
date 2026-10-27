import { z } from "zod";
import { incidentStatus } from "../db/schema/incident";
import { componentStatus } from "../db/schema/component";

const status = z.enum(incidentStatus.enumValues);
const message = z.string().trim().min(1).max(10000);
const impacts = z.array(z.strictObject({
  componentId: z.uuid(),
  status: z.enum(componentStatus.enumValues),
})).max(100).refine((entries) => new Set(entries.map((entry) => entry.componentId)).size === entries.length);

export const createIncidentSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  status,
  message,
  components: impacts,
});

export const createIncidentUpdateSchema = z.strictObject({
  status,
  message,
  components: impacts.optional(),
  removedComponentIds: z.array(z.uuid()).max(100)
    .refine((ids) => new Set(ids).size === ids.length).optional(),
}).refine((value) => {
  const removed = new Set(value.removedComponentIds);
  return !value.components?.some((entry) => removed.has(entry.componentId));
});
export type CreateIncident = z.infer<typeof createIncidentSchema>;
export type CreateIncidentUpdate = z.infer<typeof createIncidentUpdateSchema>;
