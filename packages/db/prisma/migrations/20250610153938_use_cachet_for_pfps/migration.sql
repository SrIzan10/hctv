UPDATE "User"
SET "pfpUrl" = 'https://cachet.dunkirk.sh/users/' || "slack_id" || '/r'
WHERE "slack_id" IS NOT NULL AND "slack_id" != '';