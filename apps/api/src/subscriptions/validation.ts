import { z } from "zod";

export const emailSchema = z.email().max(254).transform((value) => value.toLowerCase());
export const preferencesSchema = z.discriminatedUnion("scope", [
  z.strictObject({ scope: z.literal("all") }),
  z.strictObject({ scope: z.literal("selected"), componentIds: z.array(z.uuid()).min(1).max(100)
    .refine((ids) => new Set(ids).size === ids.length) }),
]);
export type SubscriptionPreferences = z.infer<typeof preferencesSchema>;
