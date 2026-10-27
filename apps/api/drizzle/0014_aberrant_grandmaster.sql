CREATE TABLE "component_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_page_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "component_group_id_page_id_unique" UNIQUE("id","status_page_id")
);
--> statement-breakpoint
CREATE TABLE "status_page_slug" (
	"slug" text PRIMARY KEY NOT NULL,
	"status_page_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "component" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "component_group" ADD CONSTRAINT "component_group_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_page_slug" ADD CONSTRAINT "status_page_slug_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "component_group_status_page_id_idx" ON "component_group" USING btree ("status_page_id");--> statement-breakpoint
CREATE INDEX "status_page_slug_page_id_idx" ON "status_page_slug" USING btree ("status_page_id");--> statement-breakpoint
ALTER TABLE "component" ADD CONSTRAINT "component_group_id_status_page_id_component_group_id_status_page_id_fk" FOREIGN KEY ("group_id","status_page_id") REFERENCES "public"."component_group"("id","status_page_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "status_page_slug" ("slug", "status_page_id")
SELECT "slug", "id" FROM "status_page";
