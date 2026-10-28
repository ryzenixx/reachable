import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { pageAsset, pageBranding } from "../db/schema/branding";
import { statusPage } from "../db/schema/status-page";
import { recordPageActivity } from "../activity/record";
import type { AssetKind, BrandingSettings } from "./validation";

const statusColors = { operational: "#15803d", degraded_performance: "#a16207", partial_outage: "#c2410c",
  major_outage: "#b91c1c", under_maintenance: "#1d4ed8", unknown: "#6b7280" };

export function effectiveBranding(settings: BrandingSettings = {}) {
  const overrides = settings.statusColors ?? {};
  return {
    headline: settings.headline ?? null, description: settings.description ?? null,
    websiteUrl: settings.websiteUrl ?? null, supportUrl: settings.supportUrl ?? null, links: settings.links ?? [],
    brandColor: settings.brandColor ?? "#26352d",
    statusColors: Object.fromEntries(Object.entries(statusColors).map(([key, fallback]) => [key, overrides[key as keyof typeof statusColors] ?? fallback])),
    theme: settings.theme ?? "system", groupDisplay: settings.groupDisplay ?? "expanded", showHistory: settings.showHistory ?? true,
    showComponentHistory: settings.showComponentHistory ?? true, seoTitle: settings.seoTitle ?? null,
    seoDescription: settings.seoDescription ?? null, allowIndexing: settings.allowIndexing ?? true,
    timezone: settings.timezone ?? "UTC", preferredLocale: settings.preferredLocale ?? "en", emailFooter: settings.emailFooter ?? null,
    emailLogoMode: settings.emailLogoMode ?? "auto", replyTo: settings.replyTo ?? null,
  };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function readBranding(tx: Transaction, pageId: string) {
  const [row] = await tx.select().from(pageBranding).where(eq(pageBranding.statusPageId, pageId));
  const assets = await tx.select({ kind: pageAsset.kind, digest: pageAsset.digest }).from(pageAsset).where(eq(pageAsset.statusPageId, pageId));
  return { settings: effectiveBranding(row?.settings), assets };
}

export async function getBranding(pageId: string) {
  return db.transaction((tx) => readBranding(tx, pageId), { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function updateBranding(pageId: string, input: BrandingSettings, actorId: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select({ id: statusPage.id }).from(statusPage).where(eq(statusPage.id, pageId)).for("update");
    if (!page) return undefined;
    const [previous] = await tx.select().from(pageBranding).where(eq(pageBranding.statusPageId, pageId));
    const settings: BrandingSettings = { ...previous?.settings, ...input };
    if (input.statusColors && previous?.settings.statusColors) settings.statusColors = { ...previous.settings.statusColors, ...input.statusColors };
    if (JSON.stringify(effectiveBranding(previous?.settings)) !== JSON.stringify(effectiveBranding(settings))) {
      await tx.insert(pageBranding).values({ statusPageId: pageId, settings }).onConflictDoUpdate({
        target: pageBranding.statusPageId, set: { settings, updatedAt: sql`clock_timestamp()` },
      });
      await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "branding.updated",
        resourceType: "status_page", resourceId: pageId, details: { fields: Object.keys(input) } });
    }
    return readBranding(tx, pageId);
  });
}

export async function storeAsset(pageId: string, kind: AssetKind, content: Buffer, digest: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select({ id: statusPage.id }).from(statusPage).where(eq(statusPage.id, pageId)).for("update");
    if (!page) return false;
    const [previous] = await tx.select({ digest: pageAsset.digest }).from(pageAsset)
      .where(and(eq(pageAsset.statusPageId, pageId), eq(pageAsset.kind, kind)));
    if (previous?.digest === digest) return true;
    await tx.insert(pageAsset).values({ statusPageId: pageId, kind, content, digest }).onConflictDoUpdate({
      target: [pageAsset.statusPageId, pageAsset.kind], set: { content, digest, updatedAt: sql`clock_timestamp()` },
    });
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "branding.asset_updated",
      resourceType: "status_page", resourceId: pageId, details: { kind } });
    return true;
  });
}

export async function removeAsset(pageId: string, kind: AssetKind, actorId: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select({ id: statusPage.id }).from(statusPage).where(eq(statusPage.id, pageId)).for("update");
    if (!page) return false;
    const [removed] = await tx.delete(pageAsset).where(and(eq(pageAsset.statusPageId, pageId), eq(pageAsset.kind, kind))).returning({ kind: pageAsset.kind });
    if (removed) await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "branding.asset_removed",
      resourceType: "status_page", resourceId: pageId, details: { kind } });
    return Boolean(removed);
  });
}

export async function getAsset(pageId: string, kind: AssetKind, publicOnly = false) {
  const [asset] = await db.select({ content: pageAsset.content, digest: pageAsset.digest }).from(pageAsset)
    .innerJoin(statusPage, eq(statusPage.id, pageAsset.statusPageId))
    .where(and(eq(pageAsset.statusPageId, pageId), eq(pageAsset.kind, kind), publicOnly ? eq(statusPage.published, true) : undefined));
  return asset;
}
