CREATE TABLE "webhook_failure_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"failure_code" text NOT NULL,
	"response_code" integer,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"cycle_attempts" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"last_failure_code" text,
	"last_response_code" integer,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_failure_alert_attempts_check" CHECK ("webhook_failure_alert"."attempts" >= 0),
	CONSTRAINT "webhook_failure_alert_cycle_attempts_check" CHECK ("webhook_failure_alert"."cycle_attempts" >= 0 and "webhook_failure_alert"."cycle_attempts" <= "webhook_failure_alert"."attempts")
);
--> statement-breakpoint
ALTER TABLE "webhook_failure_alert" ADD CONSTRAINT "webhook_failure_alert_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_failure_alert" ADD CONSTRAINT "webhook_failure_alert_delivery_id_notification_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_delivery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_failure_alert_pending_idx" ON "webhook_failure_alert" USING btree ("next_attempt_at","id") WHERE "webhook_failure_alert"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "webhook_failure_alert_subscription_idx" ON "webhook_failure_alert" USING btree ("subscription_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_failure_alert_one_pending_idx" ON "webhook_failure_alert" USING btree ("subscription_id") WHERE "webhook_failure_alert"."status" = 'pending';