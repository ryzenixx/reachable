import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { incident, incidentUpdate } from "./incident";
import { maintenance, maintenanceUpdate } from "./maintenance";

export const contentEditField = pgEnum("content_edit_field", ["title", "message"]);

export const incidentEdit = pgTable(
  "incident_edit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incident.id, { onDelete: "cascade" }),
    updateId: uuid("update_id"),
    field: contentEditField("field").notNull(),
    previousValue: text("previous_value").notNull(),
    newValue: text("new_value").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    index("incident_edit_incident_id_idx").on(table.incidentId, table.createdAt),
    index("incident_edit_update_id_idx").on(table.updateId),
    foreignKey({
      columns: [table.updateId, table.incidentId],
      foreignColumns: [incidentUpdate.id, incidentUpdate.incidentId],
    }).onDelete("cascade"),
    check(
      "incident_edit_target_check",
      sql`(${table.field} = 'title' and ${table.updateId} is null) or (${table.field} = 'message' and ${table.updateId} is not null)`,
    ),
  ],
);

export const maintenanceEdit = pgTable(
  "maintenance_edit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    maintenanceId: uuid("maintenance_id")
      .notNull()
      .references(() => maintenance.id, { onDelete: "cascade" }),
    updateId: uuid("update_id"),
    field: contentEditField("field").notNull(),
    previousValue: text("previous_value").notNull(),
    newValue: text("new_value").notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    index("maintenance_edit_maintenance_id_idx").on(table.maintenanceId, table.createdAt),
    index("maintenance_edit_update_id_idx").on(table.updateId),
    foreignKey({
      columns: [table.updateId, table.maintenanceId],
      foreignColumns: [maintenanceUpdate.id, maintenanceUpdate.maintenanceId],
    }).onDelete("cascade"),
    check(
      "maintenance_edit_target_check",
      sql`(${table.field} = 'title' and ${table.updateId} is null) or (${table.field} = 'message' and ${table.updateId} is not null)`,
    ),
  ],
);
