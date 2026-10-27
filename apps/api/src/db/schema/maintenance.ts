import { sql } from "drizzle-orm";
import { boolean, check, index, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { component } from "./component";
import { statusPage } from "./status-page";

export const maintenanceStatus = pgEnum("maintenance_status", ["scheduled", "in_progress", "verifying", "completed"]);

export const maintenance = pgTable("maintenance", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: maintenanceStatus("status").default("scheduled").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  autoStart: boolean("auto_start").default(false).notNull(),
  autoComplete: boolean("auto_complete").default(false).notNull(),
  notifyOnAutoTransition: boolean("notify_on_auto_transition").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("maintenance_status_page_id_idx").on(table.statusPageId),
  index("maintenance_auto_start_idx").on(table.startsAt).where(sql`${table.status} = 'scheduled' and ${table.autoStart}`),
  index("maintenance_auto_complete_idx").on(table.endsAt).where(sql`${table.status} in ('in_progress', 'verifying') and ${table.autoComplete}`),
  check("maintenance_window_check", sql`${table.endsAt} > ${table.startsAt}`)]);

export const maintenanceComponent = pgTable("maintenance_component", {
  maintenanceId: uuid("maintenance_id").notNull().references(() => maintenance.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull().references(() => component.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.maintenanceId, table.componentId] })]);

export const maintenanceUpdate = pgTable("maintenance_update", {
  id: uuid("id").defaultRandom().primaryKey(),
  maintenanceId: uuid("maintenance_id").notNull().references(() => maintenance.id, { onDelete: "cascade" }),
  status: maintenanceStatus("status").notNull(),
  message: text("message").notNull(),
  automated: boolean("automated").default(false).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("maintenance_update_maintenance_id_idx").on(table.maintenanceId),
  unique("maintenance_update_id_maintenance_id_unique").on(table.id, table.maintenanceId),
  check("maintenance_update_window_check", sql`${table.endsAt} > ${table.startsAt}`)]);

export const maintenanceUpdateComponent = pgTable("maintenance_update_component", {
  updateId: uuid("update_id").notNull().references(() => maintenanceUpdate.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull(),
  name: text("name").notNull(),
}, (table) => [primaryKey({ columns: [table.updateId, table.componentId] })]);
