DO $$ BEGIN
 CREATE TYPE "public"."payment_status_enum" AS ENUM('paid', 'upcoming', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
