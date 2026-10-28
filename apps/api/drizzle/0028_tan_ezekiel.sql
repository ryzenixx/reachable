CREATE TABLE "webhook_subscription" (
	"subscription_id" uuid PRIMARY KEY NOT NULL,
	"contact_email" text NOT NULL,
	"encrypted_secret" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_subscription" ADD CONSTRAINT "webhook_subscription_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;