import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { requireOrganization, requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { getAsset, getBranding, removeAsset, storeAsset, updateBranding } from "./queries";
import { prepareImage } from "./images";
import { sendBrandingPreview } from "./preview";
import { assetKinds, brandingSchema } from "./validation";
import { deleteAssetDoc, getAssetDoc, getBrandingDoc, previewBrandingDoc, putAssetDoc, updateBrandingDoc } from "./openapi";

type Context = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };
export const brandingRoutes = new Hono<Context>();
brandingRoutes.use("*", requireOrganization);
brandingRoutes.use("*", requireOrganizationAdmin);
brandingRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const pageId = z.uuid().safeParse(c.req.param("statusPageId"));
  if (!pageId.success) return c.json({ error: "Invalid page ID" }, 400);
  if (!await pageBelongsToOrganization(pageId.data, c.get("organizationId"))) return c.json({ error: "Not found" }, 404);
  c.set("statusPageId", pageId.data);
  await next();
});

brandingRoutes.get("/", getBrandingDoc, async (c) => c.json(await getBranding(c.get("statusPageId"))));
brandingRoutes.patch("/", updateBrandingDoc, bodyLimit({ maxSize: 16384 }), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = brandingSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const result = await updateBranding(c.get("statusPageId"), input.data, c.get("userId"));
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});
brandingRoutes.get("/assets/:kind", getAssetDoc, async (c) => {
  const kind = z.enum(assetKinds).safeParse(c.req.param("kind"));
  if (!kind.success) return c.json({ error: "Invalid asset kind" }, 400);
  const asset = await getAsset(c.get("statusPageId"), kind.data);
  if (!asset) return c.json({ error: "Not found" }, 404);
  return new Response(new Uint8Array(asset.content), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
});
brandingRoutes.put("/assets/:kind", putAssetDoc, bodyLimit({ maxSize: 2 * 1024 * 1024 }), async (c) => {
  const kind = z.enum(assetKinds).safeParse(c.req.param("kind"));
  if (!kind.success) return c.json({ error: "Invalid asset kind" }, 400);
  if (!/^(image\/png|image\/jpeg|image\/webp)(?:\s*;|$)/i.test(c.req.header("content-type") ?? "")) return c.json({ error: "Expected PNG, JPEG or WebP" }, 415);
  const image = await prepareImage(Buffer.from(await c.req.arrayBuffer()), kind.data);
  if (!image) return c.json({ error: "Invalid or oversized image" }, 400);
  if (!await storeAsset(c.get("statusPageId"), kind.data, image.content, image.digest, c.get("userId"))) return c.json({ error: "Not found" }, 404);
  return c.json({ kind: kind.data, digest: image.digest });
});
brandingRoutes.delete("/assets/:kind", deleteAssetDoc, async (c) => {
  const kind = z.enum(assetKinds).safeParse(c.req.param("kind"));
  if (!kind.success) return c.json({ error: "Invalid asset kind" }, 400);
  if (!await removeAsset(c.get("statusPageId"), kind.data, c.get("userId"))) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});

brandingRoutes.post("/email-preview", previewBrandingDoc, bodyLimit({ maxSize: 4096 }), async (c) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = z.strictObject({ email: z.email().max(254), kind: z.enum(["incident", "maintenance", "postmortem", "confirmation"]) })
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  try {
    const result = await sendBrandingPreview(c.get("statusPageId"), input.data.email, input.data.kind, c.get("userId"));
    if (result === "not_found") return c.json({ error: "Not found" }, 404);
    if (result === "rate_limited") return c.json({ error: "Please wait before sending another preview" }, 429);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Could not send preview" }, 503);
  }
});
