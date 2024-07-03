ALTER TABLE "user" ADD COLUMN "preferred_currency_id" uuid DEFAULT '6ca4676c-2612-4a1e-a0cd-661b03b910d5' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_preferred_currency_id_currency_uuid_fk" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currency"("uuid") ON DELETE set default ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
