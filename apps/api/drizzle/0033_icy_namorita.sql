CREATE TABLE "request_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "request_rate_limit_expires_at_idx" ON "request_rate_limit" USING btree ("expires_at");