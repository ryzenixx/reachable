import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { incident } from "./incident";

export const postmortem = pgTable("postmortem", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id").notNull().unique().references(() => incident.id, { onDelete: "cascade" }),
  draft: text("draft").notNull(),
  draftUpdatedBy: text("draft_updated_by").references(() => user.id, { onDelete: "set null" }),
  publishedContent: text("published_content"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedUpdatedAt: timestamp("published_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("postmortem_publication_check", sql`(${table.publishedContent} is null and ${table.publishedAt} is null and ${table.publishedUpdatedAt} is null) or (${table.publishedContent} is not null and ${table.publishedAt} is not null and ${table.publishedUpdatedAt} is not null)`)]);

export const postmortemPublication = pgTable("postmortem_publication", {
  id: uuid("id").defaultRandom().primaryKey(),
  postmortemId: uuid("postmortem_id").notNull().references(() => postmortem.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`clock_timestamp()`).notNull(),
}, (table) => [index("postmortem_publication_postmortem_id_idx").on(table.postmortemId, table.createdAt)]);
