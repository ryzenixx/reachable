import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { subscription } from "./subscription";

export type StatusNotification = {
  kind: "incident" | "maintenance" | "maintenance_reminder" | "postmortem";
  pageName: string;
  title: string;
  status: string;
  message: string;
  startsAt?: string;
  endsAt?: string;
  componentIds?: string[];
  maintenanceId?: string;
};

export const deliveryStatus = pgEnum("notification_delivery_status", ["pending", "sent", "failed", "skipped"]);

export const notificationDelivery = pgTable("notification_delivery", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscription.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull(),
  payload: jsonb("payload").$type<StatusNotification>().notNull(),
  status: deliveryStatus("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("notification_delivery_event_subscription_idx").on(table.eventId, table.subscriptionId),
  index("notification_delivery_pending_idx").on(table.nextAttemptAt, table.id).where(sql`${table.status} = 'pending'`),
  index("notification_delivery_subscription_pending_idx").on(table.subscriptionId, table.createdAt, table.id).where(sql`${table.status} = 'pending'`),
  check("notification_delivery_attempts_check", sql`${table.attempts} >= 0`),
]);
