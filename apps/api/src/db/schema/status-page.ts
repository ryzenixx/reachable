import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const statusPage = pgTable("status_page", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
