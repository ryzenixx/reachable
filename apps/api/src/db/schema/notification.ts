import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
  cycleAttempts: integer("cycle_attempts").default(0).notNull(),
  lastFailureCode: text("last_failure_code"),
  lastResponseCode: integer("last_response_code"),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("notification_delivery_event_subscription_idx").on(table.eventId, table.subscriptionId),
  index("notification_delivery_pending_idx").on(table.nextAttemptAt, table.id).where(sql`${table.status} = 'pending'`),
  index("notification_delivery_subscription_pending_idx").on(table.subscriptionId, table.createdAt, table.id).where(sql`${table.status} = 'pending'`),
  check("notification_delivery_attempts_check", sql`${table.attempts} >= 0`),
  check("notification_delivery_cycle_attempts_check", sql`${table.cycleAttempts} >= 0 and ${table.cycleAttempts} <= ${table.attempts}`),
]);

export const confirmationDelivery = pgTable("confirmation_delivery", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscription.id, { onDelete: "cascade" }),
  status: deliveryStatus("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  reason: text("reason"),
  lastFailureCode: text("last_failure_code"),
  lastResponseCode: integer("last_response_code"),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).default(sql`now() + interval '24 hours'`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  index("confirmation_delivery_pending_idx").on(table.nextAttemptAt, table.id).where(sql`${table.status} = 'pending'`),
  index("confirmation_delivery_subscription_idx").on(table.subscriptionId, table.createdAt, table.id),
  check("confirmation_delivery_attempts_check", sql`${table.attempts} >= 0`),
]);
