CREATE TABLE IF NOT EXISTS "currency" (
	"id" serial NOT NULL,
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"symbol" varchar NOT NULL,
	"name" varchar NOT NULL,
	"symbol_native" varchar NOT NULL,
	"decimalDigits" integer NOT NULL,
	"rounding" integer NOT NULL,
	"code" varchar(3) NOT NULL,
	"name_plural" varchar NOT NULL,
	CONSTRAINT "currency_name_unique" UNIQUE("name"),
	CONSTRAINT "currency_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "currency_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "currency_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment" ADD CONSTRAINT "payment_currency_id_currency_uuid_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_currency_id_currency_uuid_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("uuid") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "payment" DROP COLUMN IF EXISTS "currency";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "currency";