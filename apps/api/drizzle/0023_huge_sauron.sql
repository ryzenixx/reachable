CREATE TABLE "auth_email_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"organization_id" text,
	"encrypted_payload" text,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "auth_email_delivery_kind_check" CHECK ("auth_email_delivery"."kind" in ('verification', 'password_reset', 'invitation')),
	CONSTRAINT "auth_email_delivery_attempts_check" CHECK ("auth_email_delivery"."attempts" >= 0),
	CONSTRAINT "auth_email_delivery_payload_check" CHECK (("auth_email_delivery"."status" = 'pending') = ("auth_email_delivery"."encrypted_payload" is not null))
);
--> statement-breakpoint
CREATE INDEX "auth_email_delivery_pending_idx" ON "auth_email_delivery" USING btree ("next_attempt_at","id") WHERE "auth_email_delivery"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "auth_email_delivery_organization_idx" ON "auth_email_delivery" USING btree ("organization_id","created_at","id");