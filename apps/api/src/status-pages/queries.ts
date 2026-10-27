import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage, statusPageSlug } from "../db/schema/status-page";
import { component } from "../db/schema/component";
import { componentGroup } from "../db/schema/component-group";
import { effectiveComponentStatus } from "../components/status";
import type { CreateStatusPage, UpdateStatusPage } from "./validation";

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

export async function createStatusPage(organizationId: string, input: CreateStatusPage) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`reachable:status-page-slug:${input.slug}`}, 0))`);
    const [taken] = await tx.select({ slug: statusPageSlug.slug }).from(statusPageSlug).where(eq(statusPageSlug.slug, input.slug));
    if (taken) return undefined;
    const [page] = await tx.insert(statusPage).values({ ...input, organizationId })
      .onConflictDoNothing({ target: statusPage.slug }).returning();
    if (!page) return undefined;
    await tx.insert(statusPageSlug).values({ slug: page.slug, statusPageId: page.id });
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

export async function updateStatusPage(organizationId: string, pageId: string, input: UpdateStatusPage) {
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
    return updated;
  });
}

export async function resolvePublicSlug(slug: string) {
  const [page] = await db.select({ slug: statusPage.slug }).from(statusPageSlug)
    .innerJoin(statusPage, eq(statusPage.id, statusPageSlug.statusPageId))
    .where(and(eq(statusPageSlug.slug, slug), eq(statusPage.published, true)));
  return page?.slug;
}

export async function setStatusPagePublication(organizationId: string, pageId: string, published: boolean) {
  const [page] = await db.update(statusPage).set({ published })
    .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId)))
    .returning();
  return page;
}

export async function getPublicStatusPage(slug: string) {
  const rows = await db.select({
    pageName: statusPage.name,
    pageSlug: statusPage.slug,
    pageId: statusPage.id,
    componentId: component.id,
    groupId: component.groupId,
    componentName: component.name,
    componentDescription: component.description,
    componentStatus: effectiveComponentStatus,
  }).from(statusPage)
    .leftJoin(component, eq(component.statusPageId, statusPage.id))
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)))
    .orderBy(component.position, component.createdAt, component.id);

  if (rows.length === 0) return undefined;
  const groups = await db.select({ id: componentGroup.id, name: componentGroup.name, position: componentGroup.position })
    .from(componentGroup).innerJoin(statusPage, eq(statusPage.id, componentGroup.statusPageId))
    .where(and(eq(statusPage.id, rows[0].pageId), eq(statusPage.published, true)))
    .orderBy(componentGroup.position, componentGroup.createdAt, componentGroup.id);
  return {
    name: rows[0].pageName,
    slug: rows[0].pageSlug,
    groups,
    components: rows.flatMap((row) => row.componentId && row.componentName && row.componentStatus
      ? [{ id: row.componentId, name: row.componentName, description: row.componentDescription, status: row.componentStatus, groupId: row.groupId }]
      : []),
  };
}
