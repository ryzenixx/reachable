import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((value) => value.toLowerCase());
const link = z.url().max(2048).refine((value) => {
  const url = new URL(value);
  return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
});
const shortText = (max: number) => z.string().trim().min(1).max(max);
const timezone = z.string().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
});
const locale = z.string().min(2).max(35).refine((value) => {
  try { new Intl.Locale(value); return true; } catch { return false; }
});

export const assetKinds = ["logo", "dark_logo", "favicon", "social_image", "email_logo"] as const;
export type AssetKind = (typeof assetKinds)[number];

export const brandingSchema = z.strictObject({
  headline: shortText(100).nullable().optional(),
  description: shortText(500).nullable().optional(),
  websiteUrl: link.nullable().optional(),
  supportUrl: link.nullable().optional(),
  links: z.array(z.strictObject({ label: shortText(80), url: link })).max(8).optional(),
  brandColor: color.nullable().optional(),
  statusColors: z.strictObject({ operational: color.nullable().optional(), degraded_performance: color.nullable().optional(), partial_outage: color.nullable().optional(),
    major_outage: color.nullable().optional(), under_maintenance: color.nullable().optional(), unknown: color.nullable().optional() }).nullable().optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  groupDisplay: z.enum(["expanded", "collapsed"]).optional(),
  showHistory: z.boolean().optional(),
  showComponentHistory: z.boolean().optional(),
  seoTitle: shortText(100).nullable().optional(),
  seoDescription: shortText(300).nullable().optional(),
  allowIndexing: z.boolean().optional(),
  timezone: timezone.optional(),
  preferredLocale: locale.optional(),
  emailFooter: shortText(1000).nullable().optional(),
  emailLogoMode: z.enum(["auto", "none"]).optional(),
  replyTo: z.email().max(254).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);
export type BrandingSettings = z.infer<typeof brandingSchema>;
