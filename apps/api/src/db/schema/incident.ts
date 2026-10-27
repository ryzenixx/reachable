import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { component } from "./component";
import { statusPage } from "./status-page";

export const incidentStatus = pgEnum("incident_status", ["investigating", "identified", "monitoring", "resolved"]);

export const incident = pgTable("incident", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: incidentStatus("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("incident_status_page_id_idx").on(table.statusPageId)]);

export const incidentUpdate = pgTable("incident_update", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id").notNull().references(() => incident.id, { onDelete: "cascade" }),
  status: incidentStatus("status").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("incident_update_incident_id_idx").on(table.incidentId)]);

export const incidentComponent = pgTable("incident_component", {
  incidentId: uuid("incident_id").notNull().references(() => incident.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull().references(() => component.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.incidentId, table.componentId] })]);
