ALTER TABLE "incident_component" DROP CONSTRAINT "incident_component_component_id_component_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_component" ADD CONSTRAINT "incident_component_component_id_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component"("id") ON DELETE cascade ON UPDATE no action;