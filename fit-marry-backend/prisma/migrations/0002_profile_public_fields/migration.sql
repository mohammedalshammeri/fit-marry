ALTER TABLE "UserProfile"
  ADD COLUMN "nickname" text,
  ADD COLUMN "avatarUrl" text;

ALTER TABLE "UserProfile"
  ALTER COLUMN "nationalities" SET DEFAULT '{}',
  ALTER COLUMN "interests" SET DEFAULT '{}';
