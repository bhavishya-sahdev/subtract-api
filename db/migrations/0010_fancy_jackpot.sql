DO $$ BEGIN
 CREATE TYPE "public"."payment_status_enum" AS ENUM('paid', 'upcoming', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION increment_subscription_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "user"
    SET subscription_count = subscription_count + 1
    WHERE uuid = NEW.owner_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER increment_subscription_count_trigger
AFTER INSERT ON "subscription"
FOR EACH ROW
EXECUTE FUNCTION increment_subscription_count();

-- Create the trigger function for deleting a subscription
CREATE OR REPLACE FUNCTION decrement_subscription_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "user"
    SET subscription_count = subscription_count - 1
    WHERE uuid = OLD.owner_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for deleting a subscription
CREATE TRIGGER decrement_subscription_count_trigger
AFTER DELETE ON "subscription"
FOR EACH ROW
EXECUTE FUNCTION decrement_subscription_count();

-- Create the trigger function for inserting a new payment
CREATE OR REPLACE FUNCTION increment_payment_count()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT "owner_id" INTO user_id
    FROM "subscription"
    WHERE uuid = NEW.subscription_id;

    UPDATE "user"
    SET payment_count = payment_count + 1
    WHERE uuid = user_id;

    UPDATE "subscription"
    SET payment_count = payment_count + 1
    WHERE uuid = NEW.subscription_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for inserting a new payment
CREATE TRIGGER increment_payment_count_trigger
AFTER INSERT ON "payment"
FOR EACH ROW
EXECUTE FUNCTION increment_payment_count();

-- Create the trigger function for deleting a payment
CREATE OR REPLACE FUNCTION decrement_payment_count()
RETURNS TRIGGER AS $$
DECLARE
   user_id UUID;
BEGIN
    SELECT "owner_id" INTO user_id
    FROM "subscription"
    WHERE uuid = OLD.subscription_id;

    UPDATE "user"
    SET payment_count = payment_count - 1
    WHERE uuid = user_id;

    UPDATE "subscription"
    SET payment_count = payment_count - 1
    WHERE uuid = OLD.subscription_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for deleting a payment
CREATE TRIGGER decrement_payment_count_trigger
AFTER DELETE ON "payment"
FOR EACH ROW
EXECUTE FUNCTION decrement_payment_count();