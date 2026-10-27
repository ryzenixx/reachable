CREATE TYPE "public"."content_edit_field" AS ENUM('title', 'message');--> statement-breakpoint
CREATE TABLE "incident_edit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"update_id" uuid,
	"field" "content_edit_field" NOT NULL,
	"previous_value" text NOT NULL,
	"new_value" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "incident_edit_target_check" CHECK (("incident_edit"."field" = 'title' and "incident_edit"."update_id" is null) or ("incident_edit"."field" = 'message' and "incident_edit"."update_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "maintenance_edit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenance_id" uuid NOT NULL,
	"update_id" uuid,
	"field" "content_edit_field" NOT NULL,
	"previous_value" text NOT NULL,
	"new_value" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "maintenance_edit_target_check" CHECK (("maintenance_edit"."field" = 'title' and "maintenance_edit"."update_id" is null) or ("maintenance_edit"."field" = 'message' and "maintenance_edit"."update_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "incident_edit" ADD CONSTRAINT "incident_edit_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_edit" ADD CONSTRAINT "incident_edit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_update" ADD CONSTRAINT "incident_update_id_incident_id_unique" UNIQUE("id","incident_id");--> statement-breakpoint
ALTER TABLE "maintenance_update" ADD CONSTRAINT "maintenance_update_id_maintenance_id_unique" UNIQUE("id","maintenance_id");--> statement-breakpoint
ALTER TABLE "incident_edit" ADD CONSTRAINT "incident_edit_update_id_incident_id_incident_update_id_incident_id_fk" FOREIGN KEY ("update_id","incident_id") REFERENCES "public"."incident_update"("id","incident_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_edit" ADD CONSTRAINT "maintenance_edit_maintenance_id_maintenance_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_edit" ADD CONSTRAINT "maintenance_edit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_edit" ADD CONSTRAINT "maintenance_edit_update_id_maintenance_id_maintenance_update_id_maintenance_id_fk" FOREIGN KEY ("update_id","maintenance_id") REFERENCES "public"."maintenance_update"("id","maintenance_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_edit_incident_id_idx" ON "incident_edit" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "incident_edit_update_id_idx" ON "incident_edit" USING btree ("update_id");--> statement-breakpoint
CREATE INDEX "maintenance_edit_maintenance_id_idx" ON "maintenance_edit" USING btree ("maintenance_id","created_at");--> statement-breakpoint
CREATE INDEX "maintenance_edit_update_id_idx" ON "maintenance_edit" USING btree ("update_id");
