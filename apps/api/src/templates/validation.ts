import { z } from "zod";
import { componentStatus } from "../db/schema/component";
import { incidentStatus } from "../db/schema/incident";
import { maintenanceStatus } from "../db/schema/maintenance";

export const templateKinds = ["incident", "incident_update", "maintenance", "maintenance_update"] as const;
const name = z.string().trim().min(1).max(100);
const title = z.string().trim().min(1).max(200);
const message = z.string().trim().min(1).max(10000);
const componentId = z.uuid().transform((value) => value.toLowerCase());
const componentIds = z.array(componentId).max(100).refine((ids) => new Set(ids).size === ids.length);
const components = z.array(z.strictObject({ componentId, status: z.enum(componentStatus.enumValues) }))
  .max(100).refine((entries) => new Set(entries.map((entry) => entry.componentId)).size === entries.length);
const automation = { autoStart: z.boolean().optional(), autoComplete: z.boolean().optional(),
  notifyOnAutoTransition: z.boolean().optional(), reminderMinutes: z.int().min(1).max(10080).nullable().optional() };
const common = { name, message, notifySubscribers: z.boolean().default(false) };

export const templateSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...common, kind: z.literal("incident"), title, status: z.enum(incidentStatus.enumValues), components: components.optional() }),
  z.strictObject({ ...common, kind: z.literal("incident_update"), status: z.enum(incidentStatus.enumValues), components: components.optional() }),
  z.strictObject({ ...common, ...automation, kind: z.literal("maintenance"), title, durationMinutes: z.int().min(1).max(525600).optional(), componentIds: componentIds.optional() }),
  z.strictObject({ ...common, ...automation, kind: z.literal("maintenance_update"), status: z.enum(maintenanceStatus.enumValues), componentIds: componentIds.optional() }),
]);
export type TemplateInput = z.infer<typeof templateSchema>;
