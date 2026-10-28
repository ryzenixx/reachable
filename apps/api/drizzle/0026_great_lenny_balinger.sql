CREATE TABLE "communication_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_page_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"notify_subscribers" boolean DEFAULT false NOT NULL,
	"components_specified" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer,
	"auto_start" boolean,
	"auto_complete" boolean,
	"notify_on_auto_transition" boolean,
	"reminder_minutes" integer,
	"reminder_specified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "communication_template_id_page_unique" UNIQUE("id","status_page_id"),
	CONSTRAINT "communication_template_kind_status_check" CHECK (("communication_template"."kind" in ('incident', 'incident_update') and "communication_template"."status" in ('investigating', 'identified', 'monitoring', 'resolved')) or ("communication_template"."kind" = 'maintenance' and "communication_template"."status" = 'scheduled') or ("communication_template"."kind" = 'maintenance_update' and "communication_template"."status" in ('scheduled', 'in_progress', 'verifying', 'completed', 'cancelled'))),
	CONSTRAINT "communication_template_title_check" CHECK (("communication_template"."kind" in ('incident', 'maintenance') and "communication_template"."title" is not null) or ("communication_template"."kind" in ('incident_update', 'maintenance_update') and "communication_template"."title" is null)),
	CONSTRAINT "communication_template_duration_check" CHECK ("communication_template"."duration_minutes" is null or ("communication_template"."kind" = 'maintenance' and "communication_template"."duration_minutes" between 1 and 525600)),
	CONSTRAINT "communication_template_reminder_check" CHECK ("communication_template"."reminder_minutes" is null or ("communication_template"."kind" in ('maintenance', 'maintenance_update') and "communication_template"."reminder_minutes" between 1 and 10080)),
	CONSTRAINT "communication_template_reminder_specified_check" CHECK (("communication_template"."kind" in ('maintenance', 'maintenance_update') or not "communication_template"."reminder_specified") and ("communication_template"."reminder_specified" or "communication_template"."reminder_minutes" is null)),
	CONSTRAINT "communication_template_automation_check" CHECK ("communication_template"."kind" in ('maintenance', 'maintenance_update') or ("communication_template"."auto_start" is null and "communication_template"."auto_complete" is null and "communication_template"."notify_on_auto_transition" is null))
);
--> statement-breakpoint
CREATE TABLE "communication_template_component" (
	"template_id" uuid NOT NULL,
	"status_page_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"impact" "component_status",
	CONSTRAINT "communication_template_component_template_id_component_id_pk" PRIMARY KEY("template_id","component_id")
);
--> statement-breakpoint
ALTER TABLE "communication_template" ADD CONSTRAINT "communication_template_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_template_component" ADD CONSTRAINT "communication_template_component_template_id_status_page_id_communication_template_id_status_page_id_fk" FOREIGN KEY ("template_id","status_page_id") REFERENCES "public"."communication_template"("id","status_page_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component" ADD CONSTRAINT "component_id_status_page_id_unique" UNIQUE("id","status_page_id");--> statement-breakpoint
ALTER TABLE "communication_template_component" ADD CONSTRAINT "communication_template_component_component_id_status_page_id_component_id_status_page_id_fk" FOREIGN KEY ("component_id","status_page_id") REFERENCES "public"."component"("id","status_page_id") ON DELETE no action ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
CREATE INDEX "communication_template_page_created_idx" ON "communication_template" USING btree ("status_page_id","created_at","id");--> statement-breakpoint
CREATE INDEX "communication_template_component_component_idx" ON "communication_template_component" USING btree ("component_id");