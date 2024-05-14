ALTER TABLE "payment" ADD COLUMN "owner_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment" ADD CONSTRAINT "payment_owner_id_user_uuid_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
