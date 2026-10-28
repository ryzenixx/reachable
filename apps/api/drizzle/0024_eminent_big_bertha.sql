CREATE TABLE "component_state_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"source_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "component_state_change_status_check" CHECK ("component_state_change"."status" in ('operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance', 'unknown')),
	CONSTRAINT "component_state_change_source_check" CHECK ("component_state_change"."source" in ('baseline', 'manual', 'incident', 'maintenance'))
);
--> statement-breakpoint
ALTER TABLE "component_state_change" ADD CONSTRAINT "component_state_change_component_id_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "component_state_change_history_idx" ON "component_state_change" USING btree ("component_id","occurred_at","id");--> statement-breakpoint
LOCK TABLE component, incident, incident_component, maintenance, maintenance_component IN SHARE MODE;
--> statement-breakpoint
INSERT INTO "component_state_change" ("component_id", "status", "source")
SELECT c.id,
  CASE WHEN EXISTS (
    SELECT 1 FROM incident_component ic JOIN incident i ON i.id = ic.incident_id
    WHERE ic.component_id = c.id AND i.status <> 'resolved' AND ic.impact IS NULL
  ) THEN 'unknown'
  ELSE CASE GREATEST(
    CASE c.status WHEN 'under_maintenance' THEN 1 WHEN 'degraded_performance' THEN 2
      WHEN 'partial_outage' THEN 3 WHEN 'major_outage' THEN 4 ELSE 0 END,
    COALESCE((SELECT MAX(CASE ic.impact WHEN 'under_maintenance' THEN 1 WHEN 'degraded_performance' THEN 2
      WHEN 'partial_outage' THEN 3 WHEN 'major_outage' THEN 4 ELSE 0 END)
      FROM incident_component ic JOIN incident i ON i.id = ic.incident_id
      WHERE ic.component_id = c.id AND i.status <> 'resolved'), 0),
    CASE WHEN EXISTS (SELECT 1 FROM maintenance_component mc JOIN maintenance m ON m.id = mc.maintenance_id
      WHERE mc.component_id = c.id AND m.status IN ('in_progress', 'verifying')) THEN 1 ELSE 0 END
  ) WHEN 4 THEN 'major_outage' WHEN 3 THEN 'partial_outage' WHEN 2 THEN 'degraded_performance'
    WHEN 1 THEN 'under_maintenance' ELSE 'operational' END END,
  'baseline'
FROM component c;
