import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { statusPage } from "./status-page";

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    statusPageId: uuid("status_page_id").references(() => statusPage.id, { onDelete: "set null" }),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    apiKeyId: text("api_key_id"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (table) => [
    index("activity_organization_created_idx").on(table.organizationId, table.createdAt, table.id),
    index("activity_page_created_idx").on(table.statusPageId, table.createdAt, table.id),
    check(
      "activity_actor_type_check",
      sql`${table.actorType} in ('member', 'api_key', 'system', 'subscriber', 'unknown')`,
    ),
    check(
      "activity_actor_id_check",
      sql`${table.actorId} is null or ${table.actorType} = 'member'`,
    ),
    check(
      "activity_api_key_id_check",
      sql`(${table.actorType} = 'api_key' and ${table.apiKeyId} is not null) or (${table.actorType} <> 'api_key' and ${table.apiKeyId} is null)`,
    ),
  ],
);
