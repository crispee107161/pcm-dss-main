-- Migration 20260825050000 backfilled every pre-existing demographic row's
-- captured_at to the instant it ran (DEFAULT CURRENT_TIMESTAMP evaluates
-- once per transaction, so every row shares this exact value). That instant
-- is not a real snapshot date. Rather than have application code detect
-- "not recorded" by comparing against that hardcoded timestamp (which only
-- matches on the database it was captured from), make the column nullable
-- and represent "not recorded" as NULL directly.
ALTER TABLE "FollowerGender" ALTER COLUMN "captured_at" DROP NOT NULL;
ALTER TABLE "FollowerTerritory" ALTER COLUMN "captured_at" DROP NOT NULL;
ALTER TABLE "FollowerAgeGender" ALTER COLUMN "captured_at" DROP NOT NULL;
ALTER TABLE "FollowerAudienceRank" ALTER COLUMN "captured_at" DROP NOT NULL;

UPDATE "FollowerGender" SET "captured_at" = NULL WHERE "captured_at" = '2026-08-24 20:23:38.199';
UPDATE "FollowerTerritory" SET "captured_at" = NULL WHERE "captured_at" = '2026-08-24 20:23:38.199';
UPDATE "FollowerAgeGender" SET "captured_at" = NULL WHERE "captured_at" = '2026-08-24 20:23:38.199';
UPDATE "FollowerAudienceRank" SET "captured_at" = NULL WHERE "captured_at" = '2026-08-24 20:23:38.199';
