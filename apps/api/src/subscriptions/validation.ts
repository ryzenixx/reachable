import { z } from "zod";

export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const preferencesSchema = z.discriminatedUnion("scope", [
  z.strictObject({ scope: z.literal("all") }),
  z.strictObject({
    scope: z.literal("selected"),
    componentIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
]);
export const publicSubscriptionSchema = z.discriminatedUnion("channel", [
  z.strictObject({
    channel: z.literal("email"),
    email: emailSchema,
    preferences: preferencesSchema.optional(),
  }),
  z.strictObject({
    channel: z.literal("webhook"),
    email: emailSchema,
    url: z.string().max(2048),
    preferences: preferencesSchema.optional(),
  }),
]);
export type SubscriptionPreferences = z.infer<typeof preferencesSchema>;
