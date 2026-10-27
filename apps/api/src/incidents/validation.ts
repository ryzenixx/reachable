import { z } from "zod";
import { incidentStatus } from "../db/schema/incident";

const status = z.enum(incidentStatus.enumValues);
const message = z.string().trim().min(1).max(10000);

export const createIncidentSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  status,
  message,
  componentIds: z.array(z.uuid()).max(100).refine((ids) => new Set(ids).size === ids.length),
});

export const createIncidentUpdateSchema = z.strictObject({ status, message });
export type CreateIncident = z.infer<typeof createIncidentSchema>;
export type CreateIncidentUpdate = z.infer<typeof createIncidentUpdateSchema>;
