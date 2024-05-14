DO $$ BEGIN
 CREATE TYPE "public"."renewal_period_enum" AS ENUM('monthly', 'weekly', 'annually', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"subscription_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"currency" varchar NOT NULL,
	"amount" numeric NOT NULL,
	"payment_method" varchar,
	"payment_status" varchar DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"service_name" varchar NOT NULL,
	"created_date" date,
	"renewal_period" "renewal_period_enum" DEFAULT 'other',
	"upcoming_payment_date" date,
	"currency" varchar NOT NULL,
	"renewal_amount" numeric NOT NULL,
	"total_cost" numeric,
	"owner_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"hashed_password" varchar NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment" ADD CONSTRAINT "payment_subscription_id_subscription_uuid_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("uuid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_owner_id_user_uuid_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
