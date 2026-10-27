CREATE TYPE "public"."notification_delivery_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "notification_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "notification_delivery_attempts_check" CHECK ("notification_delivery"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "maintenance" ADD COLUMN "notify_on_auto_transition" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_event_subscription_idx" ON "notification_delivery" USING btree ("event_id","subscription_id");--> statement-breakpoint
CREATE INDEX "notification_delivery_pending_idx" ON "notification_delivery" USING btree ("next_attempt_at","id") WHERE "notification_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notification_delivery_subscription_pending_idx" ON "notification_delivery" USING btree ("subscription_id","created_at","id") WHERE "notification_delivery"."status" = 'pending';