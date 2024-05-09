CREATE TABLE IF NOT EXISTS "payment" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"subscription_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"currency" varchar NOT NULL,
	"price" numeric NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment" ADD CONSTRAINT "payment_subscription_id_subscription_uuid_fk" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("uuid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
