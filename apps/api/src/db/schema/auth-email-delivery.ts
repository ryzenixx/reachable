import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { deliveryStatus } from "./notification";

export const authEmailDelivery = pgTable("auth_email_delivery", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  subjectId: text("subject_id").notNull(),
  organizationId: text("organization_id"),
  encryptedPayload: text("encrypted_payload"),
  status: deliveryStatus("status").default("pending").notNull(),
  reason: text("reason"),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  index("auth_email_delivery_pending_idx").on(table.nextAttemptAt, table.id).where(sql`${table.status} = 'pending'`),
  index("auth_email_delivery_organization_idx").on(table.organizationId, table.createdAt, table.id),
  check("auth_email_delivery_kind_check", sql`${table.kind} in ('verification', 'password_reset', 'invitation')`),
  check("auth_email_delivery_attempts_check", sql`${table.attempts} >= 0`),
  check("auth_email_delivery_payload_check", sql`(${table.status} = 'pending') = (${table.encryptedPayload} is not null)`),
]);
