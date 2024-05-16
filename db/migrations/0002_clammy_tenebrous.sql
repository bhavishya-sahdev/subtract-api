ALTER TABLE "subscription" ADD COLUMN "payment_count" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_count" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "payment_count" integer;