ALTER TABLE "maintenance" ADD COLUMN "auto_start" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance" ADD COLUMN "auto_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_update" ADD COLUMN "automated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "maintenance_auto_start_idx" ON "maintenance" USING btree ("starts_at") WHERE "maintenance"."status" = 'scheduled' and "maintenance"."auto_start";--> statement-breakpoint
CREATE INDEX "maintenance_auto_complete_idx" ON "maintenance" USING btree ("ends_at") WHERE "maintenance"."status" in ('in_progress', 'verifying') and "maintenance"."auto_complete";