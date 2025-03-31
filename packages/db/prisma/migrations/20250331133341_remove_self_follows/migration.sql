-- Remove follows where a user is following their own personal channel
DELETE FROM "Follow" f
USING "User" u
WHERE f."userId" = u.id 
  AND f."channelId" = u."personalChannelId"
  AND u."personalChannelId" IS NOT NULL;

-- Create a function to prevent self follows
CREATE OR REPLACE FUNCTION prevent_self_follows()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE id = NEW."userId"
      AND "personalChannelId" = NEW."channelId"
      AND "personalChannelId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Users cannot follow their own personal channel';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that uses this function
CREATE TRIGGER check_self_follow
BEFORE INSERT OR UPDATE ON "Follow"
FOR EACH ROW
EXECUTE FUNCTION prevent_self_follows();