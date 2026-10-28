import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import { recordPageActivity } from "../activity/record";

export async function setFeedEnabled(organizationId: string, pageId: string, enabled: boolean, actorId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(statusPage)
      .where(and(eq(statusPage.id, pageId), eq(statusPage.organizationId, organizationId))).for("update");
    if (!current || current.feedEnabled === enabled) return current;
    const [page] = await tx.update(statusPage).set({ feedEnabled: enabled }).where(eq(statusPage.id, pageId)).returning();
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: enabled ? "feed.enabled" : "feed.disabled", resourceType: "status_page", resourceId: pageId });
    return page;
  });
}

export type FeedItem = {
  id: string;
  kind: "incident" | "maintenance" | "postmortem";
  title: string;
  status: string | null;
  message: string;
  published: string;
  updated: string;
  starts_at: string | null;
  ends_at: string | null;
  components: string | null;
};

export async function getPublicFeed(slug: string) {
  return db.transaction(async (tx) => {
    const [page] = await tx.select({ id: statusPage.id, name: statusPage.name, slug: statusPage.slug, createdAt: statusPage.createdAt })
      .from(statusPage).where(and(eq(statusPage.slug, slug), eq(statusPage.published, true), eq(statusPage.feedEnabled, true)));
    if (!page) return undefined;
    const items = await tx.execute(sql`
      select id, kind, title, status, message,
        to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as published,
        to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated,
        to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as starts_at,
        to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as ends_at, components
      from (
        select u.id, 'incident' as kind, i.title, u.status::text as status, u.message, u.created_at as published_at,
          greatest(u.created_at, coalesce((select max(e.created_at) from incident_edit e
            where e.incident_id = i.id and (e.field = 'title' or e.update_id = u.id)), u.created_at)) as updated_at,
          null::timestamptz as starts_at, null::timestamptz as ends_at,
          (select string_agg(c.name, ', ' order by c.name) from incident_update_component c where c.update_id = u.id) as components
        from incident_update u join incident i on i.id = u.incident_id where i.status_page_id = ${page.id}::uuid
        union all
        select u.id, 'maintenance', m.title, u.status::text, u.message, u.created_at,
          greatest(u.created_at, coalesce((select max(e.created_at) from maintenance_edit e
            where e.maintenance_id = m.id and (e.field = 'title' or e.update_id = u.id)), u.created_at)),
          u.starts_at, u.ends_at,
          (select string_agg(c.name, ', ' order by c.name) from maintenance_update_component c where c.update_id = u.id)
        from maintenance_update u join maintenance m on m.id = u.maintenance_id where m.status_page_id = ${page.id}::uuid
        union all
        select p.id, 'postmortem', i.title, null, p.published_content, p.published_at,
          greatest(p.published_updated_at, coalesce((select max(e.created_at) from incident_edit e
            where e.incident_id = i.id and e.field = 'title'), p.published_updated_at)),
          null::timestamptz, null::timestamptz, null::text
        from postmortem p join incident i on i.id = p.incident_id
        where i.status_page_id = ${page.id}::uuid and p.published_content is not null
      ) entries order by updated_at desc, id desc limit 50
    `) as FeedItem[];
    return { page, items };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
