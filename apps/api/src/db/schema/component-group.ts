import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { statusPage } from "./status-page";

export const componentGroup = pgTable("component_group", {
  id: uuid("id").defaultRandom().primaryKey(),
  statusPageId: uuid("status_page_id").notNull().references(() => statusPage.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("component_group_status_page_id_idx").on(table.statusPageId),
  unique("component_group_id_page_id_unique").on(table.id, table.statusPageId)]);
