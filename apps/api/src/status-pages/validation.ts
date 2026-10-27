import { z } from "zod";

const name = z.string().trim().min(1).max(100);
export const statusPageSlugSchema = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const createStatusPageSchema = z.strictObject({ name, slug: statusPageSlugSchema });
export const updateStatusPageSchema = z.strictObject({ name: name.optional(), slug: statusPageSlugSchema.optional() })
  .refine((value) => Object.keys(value).length > 0);

export type CreateStatusPage = z.infer<typeof createStatusPageSchema>;
export type UpdateStatusPage = z.infer<typeof updateStatusPageSchema>;

export const statusPageIdSchema = z.uuid();
export const publicationSchema = z.strictObject({ published: z.boolean() });
