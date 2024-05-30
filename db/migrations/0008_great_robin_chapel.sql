ALTER TABLE "subscription" RENAME COLUMN "renewal_period" TO "renewal_period_enum";--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "renewal_period_days" integer DEFAULT 1;