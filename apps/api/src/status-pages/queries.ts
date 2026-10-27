import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import { component } from "../db/schema/component";
import { effectiveComponentStatus } from "../components/status";
import type { CreateStatusPage } from "./validation";

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
  const [page] = await db.insert(statusPage)
    .values({ ...input, organizationId })
    .onConflictDoNothing({ target: statusPage.slug })
    .returning();

  return page;
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
    componentId: component.id,
    componentName: component.name,
    componentDescription: component.description,
    componentStatus: effectiveComponentStatus,
  }).from(statusPage)
    .leftJoin(component, eq(component.statusPageId, statusPage.id))
    .where(and(eq(statusPage.slug, slug), eq(statusPage.published, true)))
    .orderBy(component.position, component.createdAt, component.id);

  if (rows.length === 0) return undefined;
  return {
    name: rows[0].pageName,
    slug: rows[0].pageSlug,
    components: rows.flatMap((row) => row.componentId && row.componentName && row.componentStatus
      ? [{ id: row.componentId, name: row.componentName, description: row.componentDescription, status: row.componentStatus }]
      : []),
  };
}
