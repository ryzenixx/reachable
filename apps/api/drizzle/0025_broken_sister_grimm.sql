CREATE TABLE "page_asset" (
	"status_page_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" "bytea" NOT NULL,
	"digest" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "page_asset_status_page_id_kind_pk" PRIMARY KEY("status_page_id","kind"),
	CONSTRAINT "page_asset_kind_check" CHECK ("page_asset"."kind" in ('logo', 'dark_logo', 'favicon', 'social_image', 'email_logo')),
	CONSTRAINT "page_asset_size_check" CHECK (octet_length("page_asset"."content") <= 2097152)
);
--> statement-breakpoint
CREATE TABLE "page_branding" (
	"status_page_id" uuid PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_preview_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_asset" ADD CONSTRAINT "page_asset_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_branding" ADD CONSTRAINT "page_branding_status_page_id_status_page_id_fk" FOREIGN KEY ("status_page_id") REFERENCES "public"."status_page"("id") ON DELETE cascade ON UPDATE no action;