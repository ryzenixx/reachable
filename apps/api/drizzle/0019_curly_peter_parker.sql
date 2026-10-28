DROP INDEX "incident_page_created_idx";--> statement-breakpoint
ALTER TABLE "incident" ADD COLUMN "occurred_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "incident_page_occurred_idx" ON "incident" USING btree ("status_page_id",coalesce("occurred_at", "created_at"),"id");--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_occurred_at_check" CHECK ("incident"."occurred_at" is null or "incident"."occurred_at" <= "incident"."created_at");