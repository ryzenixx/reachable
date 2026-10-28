ALTER TABLE "confirmation_delivery" ADD COLUMN "last_failure_code" text;--> statement-breakpoint
ALTER TABLE "confirmation_delivery" ADD COLUMN "last_response_code" integer;--> statement-breakpoint
ALTER TABLE "confirmation_delivery" ADD COLUMN "last_failure_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD COLUMN "cycle_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "notification_delivery" SET "cycle_attempts" = "attempts";--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD COLUMN "last_failure_code" text;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD COLUMN "last_response_code" integer;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD COLUMN "last_failure_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_cycle_attempts_check" CHECK ("notification_delivery"."cycle_attempts" >= 0 and "notification_delivery"."cycle_attempts" <= "notification_delivery"."attempts");
