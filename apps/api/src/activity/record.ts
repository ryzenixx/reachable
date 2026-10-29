import { sql } from "drizzle-orm";
import { db } from "../db";
import { activity } from "../db/schema/activity";
import { statusPage } from "../db/schema/status-page";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Actor =
  { type: "member" | "api_key"; id: string } | { type: "system" | "subscriber" | "unknown" };
type Event = {
  actor: Actor;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
};

export async function recordPageActivity(tx: Transaction, pageId: string, event: Event) {
  await tx.execute(sql`
    insert into ${activity} (organization_id, status_page_id, actor_type, actor_id, api_key_id, action, resource_type, resource_id, details)
    select ${statusPage.organizationId}, ${statusPage.id}, ${event.actor.type}, ${event.actor.type === "member" ? event.actor.id : null},
      ${event.actor.type === "api_key" ? event.actor.id : null},
      ${event.action}, ${event.resourceType}, ${event.resourceId}, ${JSON.stringify(event.details ?? {})}::jsonb
    from ${statusPage} where ${statusPage.id} = ${pageId}::uuid
  `);
}

export async function recordOrganizationActivity(
  tx: Transaction,
  organizationId: string,
  event: Event,
) {
  await tx.insert(activity).values({
    organizationId,
    actorType: event.actor.type,
    actorId: event.actor.type === "member" ? event.actor.id : null,
    apiKeyId: event.actor.type === "api_key" ? event.actor.id : null,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    details: event.details ?? {},
  });
}
