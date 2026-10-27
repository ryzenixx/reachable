CREATE TABLE "subscription_component" (
	"subscription_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	CONSTRAINT "subscription_component_subscription_id_component_id_pk" PRIMARY KEY("subscription_id","component_id")
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "all_components" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_component" ADD CONSTRAINT "subscription_component_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_component" ADD CONSTRAINT "subscription_component_component_id_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_component_component_id_idx" ON "subscription_component" USING btree ("component_id");