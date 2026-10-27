CREATE TABLE "organization_channel" (
	"organization_id" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "organization_channel_organization_id_channel_pk" PRIMARY KEY("organization_id","channel")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status_page_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"last_requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_rate_limit" (
	"status_page_id" uuid PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_token" (
	"hash" text PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "subscription_token_purpose_check" CHECK (("subscription_token"."purpose" = 'confirm' and "subscription_token"."expires_at" is not null) or ("subscription_token"."purpose" = 'unsubscribe' and "subscription_token"."expires_at" is null))
);
--> statement-breakpoint
ALTER TABLE "organization_channel" ADD CONSTRAINT "organization_channel_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_rate_limit" ADD CONSTRAINT "subscription_rate_limit_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_token" ADD CONSTRAINT "subscription_token_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_page_channel_destination_idx" ON "subscription" USING btree ("status_page_id","channel","destination");--> statement-breakpoint
CREATE INDEX "subscription_token_subscription_id_idx" ON "subscription_token" USING btree ("subscription_id");