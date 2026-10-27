CREATE TABLE "postmortem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"draft" text NOT NULL,
	"draft_updated_by" text,
	"published_content" text,
	"published_at" timestamp with time zone,
	"published_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "postmortem_incident_id_unique" UNIQUE("incident_id"),
	CONSTRAINT "postmortem_publication_check" CHECK (("postmortem"."published_content" is null and "postmortem"."published_at" is null and "postmortem"."published_updated_at" is null) or ("postmortem"."published_content" is not null and "postmortem"."published_at" is not null and "postmortem"."published_updated_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "postmortem_publication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postmortem_id" uuid NOT NULL,
	"content" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postmortem" ADD CONSTRAINT "postmortem_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postmortem" ADD CONSTRAINT "postmortem_draft_updated_by_user_id_fk" FOREIGN KEY ("draft_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postmortem_publication" ADD CONSTRAINT "postmortem_publication_postmortem_id_postmortem_id_fk" FOREIGN KEY ("postmortem_id") REFERENCES "public"."postmortem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postmortem_publication" ADD CONSTRAINT "postmortem_publication_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postmortem_publication_postmortem_id_idx" ON "postmortem_publication" USING btree ("postmortem_id","created_at");