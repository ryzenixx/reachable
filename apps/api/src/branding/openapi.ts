import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { assetKinds, brandingSchema } from "./validation";

const nullableText = z.string().nullable();
export const publicBrandingSettings = z.object({ headline: nullableText, description: nullableText, websiteUrl: nullableText, supportUrl: nullableText,
  links: z.array(z.object({ label: z.string(), url: z.string() })), brandColor: z.string(),
  statusColors: z.object({ operational: z.string(), degraded_performance: z.string(), partial_outage: z.string(), major_outage: z.string(), under_maintenance: z.string(), unknown: z.string() }),
  theme: z.enum(["system", "light", "dark"]), groupDisplay: z.enum(["expanded", "collapsed"]), showHistory: z.boolean(), showComponentHistory: z.boolean(),
  seoTitle: nullableText, seoDescription: nullableText, allowIndexing: z.boolean(), timezone: z.string(), preferredLocale: z.string() });
const settings = publicBrandingSettings.extend({ emailFooter: nullableText, emailLogoMode: z.enum(["auto", "none"]), replyTo: nullableText });
const branding = z.object({ settings, assets: z.array(z.object({ kind: z.string(), digest: z.string() })) });
const json = (schema: Parameters<typeof resolver>[0]) => ({ "application/json": { schema: resolver(schema) } });
const error = json(z.object({ error: z.string() }));
const path = (name: string, format?: string) => ({ name, in: "path" as const, required: true, schema: { type: "string" as const, ...(format && { format }) } });
const base = [path("organizationId"), path("statusPageId", "uuid")];
const asset = [...base, { name: "kind", in: "path" as const, required: true, schema: { type: "string" as const, enum: [...assetKinds] } }];
const errors = { 400: { description: "Invalid request", content: error }, 401: { description: "Authentication required", content: error },
  403: { description: "Insufficient permissions or forbidden origin", content: error }, 404: { description: "Status page or asset not found", content: error } };
const size = (limit: string) => ({ description: `Request body exceeds ${limit}`, content: { "text/plain": { schema: { type: "string" as const } } } });
const route = (options: Parameters<typeof describeRoute>[0]) => describeRoute({ tags: ["Branding"], description: "Requires an organization owner or admin.", ...options });
const unsupported = { description: "Unsupported content type", content: error };
const image = { "image/png": { schema: { type: "string" as const, format: "binary" } } };

export const getBrandingDoc = route({ operationId: "getBranding", summary: "Get page branding", parameters: base,
  responses: { 200: { description: "Branding settings and assets", content: json(branding) }, ...errors } });
export const updateBrandingDoc = route({ operationId: "updateBranding", summary: "Update page branding", parameters: base,
  requestBody: { required: true, description: "At least one field is required.", content: json(brandingSchema) },
  responses: { 200: { description: "Branding settings and assets", content: json(branding) }, ...errors, 413: size("16 KiB"), 415: unsupported } });
export const getAssetDoc = route({ operationId: "getBrandingAsset", summary: "Get a branding asset", parameters: asset,
  responses: { 200: { description: "PNG image", content: image }, ...errors } });
export const putAssetDoc = route({ operationId: "putBrandingAsset", summary: "Upload a branding asset", parameters: asset,
  requestBody: { required: true, content: { ...image, "image/jpeg": image["image/png"], "image/webp": image["image/png"] } },
  responses: { 200: { description: "Stored asset", content: json(z.object({ kind: z.enum(assetKinds), digest: z.string() })) }, ...errors, 413: size("2 MiB"), 415: unsupported } });
export const deleteAssetDoc = route({ operationId: "deleteBrandingAsset", summary: "Delete a branding asset", parameters: asset,
  responses: { 204: { description: "Asset deleted" }, ...errors } });
export const previewBrandingDoc = route({ operationId: "sendBrandingPreview", summary: "Send a branded email preview", parameters: base,
  requestBody: { required: true, content: json(z.strictObject({ email: z.email().max(254), kind: z.enum(["incident", "maintenance", "postmortem", "confirmation"]) })) },
  responses: { 200: { description: "Preview sent", content: json(z.object({ success: z.literal(true) })) }, ...errors, 413: size("4 KiB"), 415: unsupported,
    429: { description: "Preview rate limit", content: error }, 503: { description: "Could not send preview", content: error } } });
