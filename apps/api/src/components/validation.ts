import { z } from "zod";
import { componentStatus } from "../db/schema/component";

const fields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  status: z.enum(componentStatus.enumValues),
  position: z.int().min(0).max(2147483647),
};

export const createComponentSchema = z.strictObject({
  name: fields.name,
  description: fields.description.optional(),
  status: fields.status.optional(),
  position: fields.position.optional(),
});

export const updateComponentSchema = z.strictObject({
  name: fields.name.optional(),
  description: fields.description.optional(),
  status: fields.status.optional(),
  position: fields.position.optional(),
}).refine((value) => Object.keys(value).length > 0);

export const componentIdSchema = z.uuid();
export type CreateComponent = z.infer<typeof createComponentSchema>;
export type UpdateComponent = z.infer<typeof updateComponentSchema>;
