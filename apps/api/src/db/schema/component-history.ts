import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { component } from "./component";

export const componentStateChange = pgTable(
  "component_state_change",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => component.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    source: text("source").notNull(),
    sourceId: uuid("source_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    index("component_state_change_history_idx").on(table.componentId, table.occurredAt, table.id),
    check(
      "component_state_change_status_check",
      sql`${table.status} in ('operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance', 'unknown')`,
    ),
    check(
      "component_state_change_source_check",
      sql`${table.source} in ('baseline', 'manual', 'incident', 'maintenance')`,
    ),
  ],
);
