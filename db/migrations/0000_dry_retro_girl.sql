DO $$ BEGIN
 CREATE TYPE "renewal_period" AS ENUM('monthly', 'weekly', 'annually', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" date,
	"updated_at" date,
	"service_name" varchar NOT NULL,
	"created_date" date,
	"renewal_period" "renewal_period" DEFAULT 'other',
	"upcoming_payment_date" date,
	"currency" varchar NOT NULL,
	"renewal_price" numeric NOT NULL,
	"total_cost" numeric,
	"user_id" uuid NOT NULL,
	CONSTRAINT "subscription_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" date,
	"updated_at" date,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	CONSTRAINT "user_id_unique" UNIQUE("id"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_uuid_fk" FOREIGN KEY ("user_id") REFERENCES "user"("uuid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
