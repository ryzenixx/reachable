CREATE TYPE "public"."component_status" AS ENUM('operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance');--> statement-breakpoint
CREATE TABLE "component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_page_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "component_status" DEFAULT 'operational' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "component" ADD CONSTRAINT "component_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "component_status_page_id_idx" ON "component" USING btree ("status_page_id");