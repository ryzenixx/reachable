import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { notificationDelivery } from "../db/schema/notification";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function correctPendingNotifications(tx: Transaction, eventIds: SQL, field: "title" | "message", value: string) {
  await tx.execute(sql`
    update ${notificationDelivery}
    set payload = jsonb_set(${notificationDelivery.payload}, array[${field}::text], to_jsonb(${value}::text))
    where ${notificationDelivery.status} = 'pending' and ${notificationDelivery.eventId} in (${eventIds})
  `);
}
