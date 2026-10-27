import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { statusPage } from "./status-page";
import { component } from "./component";

export const organizationChannel = pgTable("organization_channel", {
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
}, (table) => [primaryKey({ columns: [table.organizationId, table.channel] })]);

export const subscription = pgTable("subscription", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  destination: text("destination").notNull(),
  allComponents: boolean("all_components").default(true).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  lastRequestedAt: timestamp("last_requested_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("subscription_page_channel_destination_idx").on(table.statusPageId, table.channel, table.destination)]);

export const subscriptionComponent = pgTable("subscription_component", {
  subscriptionId: uuid("subscription_id").notNull().references(() => subscription.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull().references(() => component.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.subscriptionId, table.componentId] }),
  index("subscription_component_component_id_idx").on(table.componentId)]);

export const subscriptionToken = pgTable("subscription_token", {
  hash: text("hash").primaryKey(),
  subscriptionId: uuid("subscription_id").notNull().references(() => subscription.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [index("subscription_token_subscription_id_idx").on(table.subscriptionId),
  check("subscription_token_purpose_check", sql`(${table.purpose} = 'confirm' and ${table.expiresAt} is not null) or (${table.purpose} = 'unsubscribe' and ${table.expiresAt} is null)`)]);

export const subscriptionRateLimit = pgTable("subscription_rate_limit", {
  statusPageId: uuid("status_page_id").primaryKey().references(() => statusPage.id, { onDelete: "cascade" }),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
