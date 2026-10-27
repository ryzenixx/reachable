CREATE TYPE "public"."maintenance_status" AS ENUM('scheduled', 'in_progress', 'verifying', 'completed');--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_page_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "maintenance_status" DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_window_check" CHECK ("maintenance"."ends_at" > "maintenance"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "maintenance_component" (
	"maintenance_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	CONSTRAINT "maintenance_component_maintenance_id_component_id_pk" PRIMARY KEY("maintenance_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "maintenance_update" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenance_id" uuid NOT NULL,
	"status" "maintenance_status" NOT NULL,
	"message" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maintenance_update_window_check" CHECK ("maintenance_update"."ends_at" > "maintenance_update"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "maintenance_update_component" (
	"update_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "maintenance_update_component_update_id_component_id_pk" PRIMARY KEY("update_id","component_id")
);
--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_component" ADD CONSTRAINT "maintenance_component_maintenance_id_maintenance_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_component" ADD CONSTRAINT "maintenance_component_component_id_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_update" ADD CONSTRAINT "maintenance_update_maintenance_id_maintenance_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_update_component" ADD CONSTRAINT "maintenance_update_component_update_id_maintenance_update_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."maintenance_update"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_status_page_id_idx" ON "maintenance" USING btree ("status_page_id");--> statement-breakpoint
CREATE INDEX "maintenance_update_maintenance_id_idx" ON "maintenance_update" USING btree ("maintenance_id");