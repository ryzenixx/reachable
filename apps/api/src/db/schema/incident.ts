import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { component, componentStatus } from "./component";
import { statusPage } from "./status-page";

export const incidentStatus = pgEnum("incident_status", ["investigating", "identified", "monitoring", "resolved"]);

export const incident = pgTable("incident", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: incidentStatus("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("incident_page_created_idx").on(table.statusPageId, table.createdAt, table.id)]);

export const incidentUpdate = pgTable("incident_update", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id").notNull().references(() => incident.id, { onDelete: "cascade" }),
  status: incidentStatus("status").notNull(),
  message: text("message").notNull(),
  componentsRecorded: boolean("components_recorded").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("incident_update_incident_id_idx").on(table.incidentId),
  unique("incident_update_id_incident_id_unique").on(table.id, table.incidentId)]);

export const incidentComponent = pgTable("incident_component", {
  incidentId: uuid("incident_id").notNull().references(() => incident.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull().references(() => component.id, { onDelete: "cascade" }),
  impact: componentStatus("impact"),
}, (table) => [primaryKey({ columns: [table.incidentId, table.componentId] })]);

export const incidentUpdateComponent = pgTable("incident_update_component", {
  updateId: uuid("update_id").notNull().references(() => incidentUpdate.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull(),
  name: text("name").notNull(),
  impact: componentStatus("impact"),
}, (table) => [primaryKey({ columns: [table.updateId, table.componentId] })]);
