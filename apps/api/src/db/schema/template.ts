import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { component, componentStatus } from "./component";
import { statusPage } from "./status-page";

export const communicationTemplate = pgTable("communication_template", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  message: text("message").notNull(),
  status: text("status").notNull(),
  notifySubscribers: boolean("notify_subscribers").default(false).notNull(),
  componentsSpecified: boolean("components_specified").default(false).notNull(),
  durationMinutes: integer("duration_minutes"),
  autoStart: boolean("auto_start"),
  autoComplete: boolean("auto_complete"),
  notifyOnAutoTransition: boolean("notify_on_auto_transition"),
  reminderMinutes: integer("reminder_minutes"),
  reminderSpecified: boolean("reminder_specified").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
}, (table) => [
  unique("communication_template_id_page_unique").on(table.id, table.statusPageId),
  index("communication_template_page_created_idx").on(table.statusPageId, table.createdAt, table.id),
  check("communication_template_kind_status_check", sql`(${table.kind} in ('incident', 'incident_update') and ${table.status} in ('investigating', 'identified', 'monitoring', 'resolved')) or (${table.kind} = 'maintenance' and ${table.status} = 'scheduled') or (${table.kind} = 'maintenance_update' and ${table.status} in ('scheduled', 'in_progress', 'verifying', 'completed', 'cancelled'))`),
  check("communication_template_title_check", sql`(${table.kind} in ('incident', 'maintenance') and ${table.title} is not null) or (${table.kind} in ('incident_update', 'maintenance_update') and ${table.title} is null)`),
  check("communication_template_duration_check", sql`${table.durationMinutes} is null or (${table.kind} = 'maintenance' and ${table.durationMinutes} between 1 and 525600)`),
  check("communication_template_reminder_check", sql`${table.reminderMinutes} is null or (${table.kind} in ('maintenance', 'maintenance_update') and ${table.reminderMinutes} between 1 and 10080)`),
  check("communication_template_reminder_specified_check", sql`(${table.kind} in ('maintenance', 'maintenance_update') or not ${table.reminderSpecified}) and (${table.reminderSpecified} or ${table.reminderMinutes} is null)`),
  check("communication_template_automation_check", sql`${table.kind} in ('maintenance', 'maintenance_update') or (${table.autoStart} is null and ${table.autoComplete} is null and ${table.notifyOnAutoTransition} is null)`),
]);

export const communicationTemplateComponent = pgTable("communication_template_component", {
  templateId: uuid("template_id").notNull(),
  statusPageId: uuid("status_page_id").notNull(),
  componentId: uuid("component_id").notNull(),
  impact: componentStatus("impact"),
}, (table) => [
  primaryKey({ columns: [table.templateId, table.componentId] }),
  foreignKey({ columns: [table.templateId, table.statusPageId], foreignColumns: [communicationTemplate.id, communicationTemplate.statusPageId] }).onDelete("cascade"),
  // The migration defers this constraint so page deletion can cascade through both relationships.
  foreignKey({ columns: [table.componentId, table.statusPageId], foreignColumns: [component.id, component.statusPageId] }).onDelete("no action"),
  index("communication_template_component_component_idx").on(table.componentId),
]);
