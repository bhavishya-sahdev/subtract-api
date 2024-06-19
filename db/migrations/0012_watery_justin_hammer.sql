ALTER TABLE "user" ADD COLUMN "is_google_user" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_id" varchar;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_access_token" varchar;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_refresh_token" varchar;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_token_expires_at" varchar;