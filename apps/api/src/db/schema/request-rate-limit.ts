import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const requestRateLimit = pgTable(
  "request_rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("request_rate_limit_expires_at_idx").on(table.expiresAt)],
);
