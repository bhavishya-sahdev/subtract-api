

ALTER TABLE "payment" ADD COLUMN "payment_status_enum" "payment_status_enum" DEFAULT 'paid';--> statement-breakpoint
ALTER TABLE "payment" DROP COLUMN IF EXISTS "payment_status";