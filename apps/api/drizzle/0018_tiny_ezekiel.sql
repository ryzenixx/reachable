DROP INDEX "incident_status_page_id_idx";--> statement-breakpoint
DROP INDEX "maintenance_status_page_id_idx";--> statement-breakpoint
CREATE INDEX "incident_page_created_idx" ON "incident" USING btree ("status_page_id","created_at","id");--> statement-breakpoint
CREATE INDEX "maintenance_page_created_idx" ON "maintenance" USING btree ("status_page_id","created_at","id");