import { z } from "zod";

const actions = z.array(z.enum(["read", "write"])).min(1).max(2)
  .refine((values) => new Set(values).size === values.length);
export const permissionsSchema = z.strictObject({
  components: actions.optional(),
  incidents: actions.optional(),
  maintenances: actions.optional(),
}).refine((permissions) => Object.keys(permissions).length > 0);

export const createApiKeySchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  pageId: z.uuid(),
  expiresInDays: z.int().min(1).max(365).default(90),
  permissions: permissionsSchema,
});
