import { sql } from "drizzle-orm";
import {
  check,
  customType,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { statusPage } from "./status-page";
import type { BrandingSettings } from "../../branding/validation";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const pageBranding = pgTable("page_branding", {
  statusPageId: uuid("status_page_id")
    .primaryKey()
    .references(() => statusPage.id, { onDelete: "cascade" }),
  settings: jsonb("settings").$type<BrandingSettings>().notNull().default({}),
  lastPreviewAt: timestamp("last_preview_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`clock_timestamp()`)
    .notNull(),
});

export const pageAsset = pgTable(
  "page_asset",
  {
    statusPageId: uuid("status_page_id")
      .notNull()
      .references(() => statusPage.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    content: bytea("content").notNull(),
    digest: text("digest").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.statusPageId, table.kind] }),
    check(
      "page_asset_kind_check",
      sql`${table.kind} in ('logo', 'dark_logo', 'favicon', 'social_image', 'email_logo')`,
    ),
    check("page_asset_size_check", sql`octet_length(${table.content}) <= 2097152`),
  ],
);
