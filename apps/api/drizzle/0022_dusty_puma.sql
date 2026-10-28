CREATE TABLE "confirmation_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '24 hours' NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "confirmation_delivery_attempts_check" CHECK ("confirmation_delivery"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "confirmation_delivery" ADD CONSTRAINT "confirmation_delivery_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "confirmation_delivery_pending_idx" ON "confirmation_delivery" USING btree ("next_attempt_at","id") WHERE "confirmation_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "confirmation_delivery_subscription_idx" ON "confirmation_delivery" USING btree ("subscription_id","created_at","id");