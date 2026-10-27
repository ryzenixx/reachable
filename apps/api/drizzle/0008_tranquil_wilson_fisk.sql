CREATE TABLE "incident_update_component" (
	"update_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"name" text NOT NULL,
	"impact" "component_status",
	CONSTRAINT "incident_update_component_update_id_component_id_pk" PRIMARY KEY("update_id","component_id")
);
--> statement-breakpoint
ALTER TABLE "incident_update" ADD COLUMN "components_recorded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_update_component" ADD CONSTRAINT "incident_update_component_update_id_incident_update_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."incident_update"("id") ON DELETE cascade ON UPDATE no action;