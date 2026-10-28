import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage, statusPageSlug } from "../db/schema/status-page";
import { component } from "../db/schema/component";
import { componentGroup } from "../db/schema/component-group";
import { incident, incidentComponent } from "../db/schema/incident";
import { maintenance, maintenanceComponent } from "../db/schema/maintenance";
import { effectiveComponentStatus } from "../components/status";
import type { CreateStatusPage, UpdateStatusPage } from "./validation";
import { summarizeStatus } from "./status";
import { recordPageActivity } from "../activity/record";
import { readBranding } from "../branding/queries";

export function listStatusPages(organizationId: string) {
  return db.select().from(statusPage)
    .where(eq(statusPage.organizationId, organizationId))
    .orderBy(statusPage.createdAt, statusPage.id);
}

export async function pageBelongsToOrganization(pageId: string, organizationId: string) {
  const [page] = await db.select({ id: statusPage.id }).from(statusPage)
    .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId)))
    .limit(1);
  return Boolean(page);
}

export async function createStatusPage(organizationId: string, input: CreateStatusPage, actorId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`reachable:status-page-slug:${input.slug}`}, 0))`);
    const [taken] = await tx.select({ slug: statusPageSlug.slug }).from(statusPageSlug).where(eq(statusPageSlug.slug, input.slug));
    if (taken) return undefined;
    const [page] = await tx.insert(statusPage).values({ ...input, organizationId })
      .onConflictDoNothing({ target: statusPage.slug }).returning();
    if (!page) return undefined;
    await tx.insert(statusPageSlug).values({ slug: page.slug, statusPageId: page.id });
    await recordPageActivity(tx, page.id, { actor: { type: "member", id: actorId }, action: "status_page.created", resourceType: "status_page", resourceId: page.id });
    return page;
  });
}

export async function isStatusPageSlugAvailable(slug: string) {
  const [reserved] = await db.select({ slug: statusPageSlug.slug }).from(statusPageSlug).where(eq(statusPageSlug.slug, slug));
  return !reserved;
}

export async function getStatusPage(organizationId: string, pageId: string) {
  const [page] = await db.select().from(statusPage)
    .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId)));
  return page;
}

export async function updateStatusPage(organizationId: string, pageId: string, input: UpdateStatusPage, actorId: string) {
  return db.transaction(async (tx) => {
    if (input.slug) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`reachable:status-page-slug:${input.slug}`}, 0))`);
    const [current] = await tx.select().from(statusPage)
      .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId))).for("update");
    if (!current) return undefined;
    if (input.slug && input.slug !== current.slug) {
      const [reserved] = await tx.insert(statusPageSlug).values({ slug: input.slug, statusPageId: current.id })
        .onConflictDoNothing({ target: statusPageSlug.slug }).returning({ slug: statusPageSlug.slug });
      if (!reserved) return "slug_taken" as const;
    }
    const [updated] = await tx.update(statusPage).set(input).where(eq(statusPage.id, current.id)).returning();
    const fields = (Object.keys(input) as (keyof UpdateStatusPage)[]).filter((field) => input[field] !== current[field]);
    if (fields.length) await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "status_page.updated", resourceType: "status_page", resourceId: pageId, details: { fields } });
    return updated;
  });
}

export async function resolvePublicSlug(slug: string) {
  const [page] = await db.select({ slug: statusPage.slug }).from(statusPageSlug)
    .innerJoin(statusPage, eq(statusPage.id, statusPageSlug.statusPageId))
    .where(and(eq(statusPageSlug.slug, slug), eq(statusPage.published, true)));
  return page?.slug;
}

export async function setStatusPagePublication(organizationId: string, pageId: string, published: boolean, actorId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(statusPage)
      .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId))).for("update");
    if (!current || current.published === published) return current;
    const [page] = await tx.update(statusPage).set({ published }).where(eq(statusPage.id, pageId)).returning();
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: published ? "status_page.published" : "status_page.unpublished", resourceType: "status_page", resourceId: pageId });
    return page;
  });
}

export async function getPublicStatusPage(slug: string) {
  return db.transaction(async (tx) => {
    const rows = await tx.select({
      pageName: statusPage.name,
      pageSlug: statusPage.slug,
      pageId: statusPage.id,
      feedEnabled: statusPage.feedEnabled,
      componentId: component.id,
      groupId: component.groupId,
      componentName: component.name,
      componentDescription: component.description,
      componentStatus: effectiveComponentStatus,
      activeIncidents: sql<boolean>`exists (
        select 1 from ${incident} where ${incident.statusPageId} = ${statusPage.id} and ${incident.status} <> 'resolved'
      )`,
      activeMaintenances: sql<boolean>`exists (
        select 1 from ${maintenance} where ${maintenance.statusPageId} = ${statusPage.id}
          and ${maintenance.status} in ('in_progress', 'verifying')
      )`,
      unscopedImpact: sql<boolean>`exists (
        select 1 from ${incident} where ${incident.statusPageId} = ${statusPage.id} and ${incident.status} <> 'resolved'
          and not exists (select 1 from ${incidentComponent} where ${incidentComponent.incidentId} = ${incident.id})
      ) or exists (
        select 1 from ${maintenance} where ${maintenance.statusPageId} = ${statusPage.id}
          and ${maintenance.status} in ('in_progress', 'verifying')
          and not exists (select 1 from ${maintenanceComponent} where ${maintenanceComponent.maintenanceId} = ${maintenance.id})
      )`,
    }).from(statusPage)
      .leftJoin(component, eq(component.statusPageId, statusPage.id))
      .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)))
      .orderBy(component.position, component.createdAt, component.id);

    if (rows.length === 0) return undefined;
    const groups = await tx.select({ id: componentGroup.id, name: componentGroup.name, position: componentGroup.position })
      .from(componentGroup).innerJoin(statusPage, eq(statusPage.id, componentGroup.statusPageId))
      .where(and(eq(statusPage.id, rows[0].pageId), eq(statusPage.published, true)))
      .orderBy(componentGroup.position, componentGroup.createdAt, componentGroup.id);
    const components = rows.flatMap((row) => row.componentId && row.componentName && row.componentStatus
      ? [{ id: row.componentId, name: row.componentName, description: row.componentDescription, status: row.componentStatus, groupId: row.groupId }]
      : []);
    const branding = await readBranding(tx, rows[0].pageId);
    const { emailFooter: _, replyTo: __, emailLogoMode: ___, ...publicSettings } = branding.settings;
    return {
      name: rows[0].pageName,
      slug: rows[0].pageSlug,
      feeds: rows[0].feedEnabled ? {
        rss: `/api/public/status-pages/${encodeURIComponent(rows[0].pageSlug)}/feed.rss`,
        atom: `/api/public/status-pages/${encodeURIComponent(rows[0].pageSlug)}/feed.atom`,
      } : null,
      branding: { ...publicSettings, assets: Object.fromEntries(branding.assets.map(({ kind, digest }) => [kind,
        `/api/public/status-pages/${encodeURIComponent(rows[0].pageSlug)}/branding/assets/${kind}?v=${digest}`])) },
      summary: summarizeStatus(components.map((entry) => entry.status), rows[0].activeIncidents,
        rows[0].activeMaintenances, rows[0].unscopedImpact),
      groups,
      components,
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
