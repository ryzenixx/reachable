import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { statusPage } from "./status-page";

export const componentStatus = pgEnum("component_status", [
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
]);

export const component = pgTable("component", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull()
    .references(() => statusPage.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: componentStatus("status").default("operational").notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("component_status_page_id_idx").on(table.statusPageId)]);
