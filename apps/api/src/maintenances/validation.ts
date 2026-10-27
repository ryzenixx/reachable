import { z } from "zod";
import { maintenanceStatus } from "../db/schema/maintenance";

const date = z.iso.datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)));
const componentIds = z.array(z.uuid()).max(100)
  .refine((ids) => new Set(ids).size === ids.length);
const message = z.string().trim().min(1).max(10000);

export const createMaintenanceSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  message,
  startsAt: date,
  endsAt: date,
  componentIds,
}).refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt));

export const createMaintenanceUpdateSchema = z.strictObject({
  status: z.enum(maintenanceStatus.enumValues),
  message,
  startsAt: date.optional(),
  endsAt: date.optional(),
  componentIds: componentIds.optional(),
});

export type CreateMaintenance = z.infer<typeof createMaintenanceSchema>;
export type CreateMaintenanceUpdate = z.infer<typeof createMaintenanceUpdateSchema>;
