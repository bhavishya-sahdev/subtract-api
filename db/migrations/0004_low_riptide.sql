ALTER TABLE "subscription" ALTER COLUMN "payment_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "subscription_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "payment_count" SET DEFAULT 0;