import { z } from "zod";

const fields = {
  name: z.string().trim().min(1).max(100),
  position: z.int().min(0).max(2147483647),
};

export const createGroupSchema = z.strictObject({ name: fields.name, position: fields.position.optional() });
export const updateGroupSchema = z.strictObject({ name: fields.name.optional(), position: fields.position.optional() })
  .refine((value) => Object.keys(value).length > 0);
export type CreateGroup = z.infer<typeof createGroupSchema>;
export type UpdateGroup = z.infer<typeof updateGroupSchema>;
