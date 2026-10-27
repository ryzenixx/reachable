import { z } from "zod";

export const createStatusPageSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  slug: z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type CreateStatusPage = z.infer<typeof createStatusPageSchema>;

export const statusPageIdSchema = z.uuid();
export const publicationSchema = z.strictObject({ published: z.boolean() });
