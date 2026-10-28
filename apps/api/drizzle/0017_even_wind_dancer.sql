ALTER TYPE "public"."maintenance_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "maintenance_reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenance_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	CONSTRAINT "maintenance_reminder_window_unique" UNIQUE("maintenance_id","starts_at")
);
--> statement-breakpoint
ALTER TABLE "maintenance" ADD COLUMN "reminder_minutes" integer;--> statement-breakpoint
ALTER TABLE "maintenance_reminder" ADD CONSTRAINT "maintenance_reminder_maintenance_id_maintenance_id_fk" FOREIGN KEY ("maintenance_id") REFERENCES "public"."maintenance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_reminder_minutes_check" CHECK ("maintenance"."reminder_minutes" is null or "maintenance"."reminder_minutes" between 1 and 10080);