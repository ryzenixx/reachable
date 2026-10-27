import { sql } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery, type StatusNotification } from "../db/schema/notification";
import { statusPage } from "../db/schema/status-page";
import { organizationChannel, subscription } from "../db/schema/subscription";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function enqueueStatusNotification(tx: Transaction, pageId: string, eventId: string, payload: Omit<StatusNotification, "pageName">) {
  await tx.execute(sql`
    insert into ${notificationDelivery} (subscription_id, event_id, payload)
    select ${subscription.id}, ${eventId}::uuid,
      jsonb_build_object('kind', ${payload.kind}::text, 'pageName', ${statusPage.name},
        'title', ${payload.title}::text, 'status', ${payload.status}::text, 'message', ${payload.message}::text,
        'startsAt', ${payload.startsAt ?? null}::text, 'endsAt', ${payload.endsAt ?? null}::text)
    from ${subscription}
    inner join ${statusPage} on ${statusPage.id} = ${subscription.statusPageId}
    inner join ${organizationChannel} on ${organizationChannel.organizationId} = ${statusPage.organizationId}
      and ${organizationChannel.channel} = ${subscription.channel} and ${organizationChannel.enabled} = true
    where ${statusPage.id} = ${pageId}::uuid and ${statusPage.published} = true
      and ${subscription.confirmedAt} is not null and ${subscription.channel} = 'email'
    on conflict (event_id, subscription_id) do nothing
  `);
}
