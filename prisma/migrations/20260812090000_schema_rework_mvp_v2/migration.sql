-- MVP v2 schema rework (see docs/mvp.md §6, §7 step 1)
-- Three roles (drop Sales Director), Ad keyed on (Ad ID, Reporting starts)
-- instead of names, FR-15 permanent category columns, ADS_DAILY_CSV retired.

-- CreateEnum
CREATE TYPE "CategoryLabel" AS ENUM ('PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT', 'UNCLASSIFIED');

-- Add FacebookPost's new columns before touching category_id so the backfill
-- below has both the old FK and the new columns available at once.
ALTER TABLE "FacebookPost"
  ADD COLUMN "category_keyword" "CategoryLabel",
  ADD COLUMN "category_llm" "CategoryLabel",
  ADD COLUMN "category_final" "CategoryLabel",
  ADD COLUMN "duration_sec" DOUBLE PRECISION,
  ADD COLUMN "avg_seconds_viewed" DOUBLE PRECISION;

-- Backfill category_final from the old FK so existing manual categorisations
-- survive. Posts with a null category_id become null here too (never assigned
-- is not the same fact as assigned-and-unclassifiable).
UPDATE "FacebookPost" p
SET "category_final" = CASE c.name
  WHEN 'Product Showcase' THEN 'PRODUCT_SHOWCASE'::"CategoryLabel"
  WHEN 'Promotional Offer' THEN 'PROMOTIONAL_OFFER'::"CategoryLabel"
  WHEN 'Testimonial' THEN 'TESTIMONIAL'::"CategoryLabel"
  WHEN 'Entertainment' THEN 'ENTERTAINMENT'::"CategoryLabel"
END
FROM "Category" c
WHERE p."category_id" = c.id;

-- DropForeignKey
ALTER TABLE "FacebookPost" DROP CONSTRAINT "FacebookPost_category_id_fkey";
ALTER TABLE "Ad" DROP CONSTRAINT "Ad_category_id_fkey";

ALTER TABLE "FacebookPost" DROP COLUMN "category_id";

-- AlterEnum: Role — SALES_DIRECTOR renamed to MARKETING_TEAM (mvp.md §2: three
-- roles, no Sales Director; the third role is Marketing Team Member).
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('MARKETING_MANAGER', 'MARKETING_TEAM', 'BUSINESS_OWNER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text WHEN 'SALES_DIRECTOR' THEN 'MARKETING_TEAM' ELSE "role"::text END
)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- Historical audit rows for a retired upload type. The system never ingests
-- ADS_DAILY_CSV under the new export policy (mvp.md §4.7) and there is no
-- surviving type to remap these onto — they were never monthly-format uploads.
DELETE FROM "UploadLog" WHERE upload_type = 'ADS_DAILY_CSV';

-- AlterEnum: UploadType — drop ADS_DAILY_CSV
BEGIN;
CREATE TYPE "UploadType_new" AS ENUM ('ADS_CSV', 'POSTS_CSV', 'PAGE_METRIC_CSV', 'FOLLOWER_HISTORY_CSV', 'PAGE_VIEWERS_CSV', 'DEMOGRAPHICS_CSV');
ALTER TABLE "UploadLog" ALTER COLUMN "upload_type" TYPE "UploadType_new" USING ("upload_type"::text::"UploadType_new");
ALTER TYPE "UploadType" RENAME TO "UploadType_old";
ALTER TYPE "UploadType_new" RENAME TO "UploadType";
DROP TYPE "public"."UploadType_old";
COMMIT;

-- Ad table rework. Existing rows carry no Ad ID — the old export/key
-- (ad_name, ad_set_name, reporting_starts) collapses distinct ads (verified:
-- 297 ad names across 309 ad IDs, docs/data_catalog.md §1) and cannot be
-- migrated forward onto (Ad ID, Reporting starts). Truncated here; re-ingested
-- from data/New_FB_Ads_Data/ in the ingestion build step (mvp.md §7 step 2).
TRUNCATE TABLE "Ad";

DROP INDEX "Ad_ad_name_ad_set_name_reporting_starts_key";

ALTER TABLE "Ad"
  DROP COLUMN "category_id",
  ADD COLUMN "ad_id" TEXT NOT NULL,
  ADD COLUMN "ad_set_id" TEXT NOT NULL,
  ADD COLUMN "campaign_id" TEXT NOT NULL,
  ADD COLUMN "campaign_name" TEXT NOT NULL,
  ADD COLUMN "frequency" DOUBLE PRECISION,
  ADD COLUMN "post_engagements" INTEGER,
  ADD COLUMN "result_type" TEXT,
  ADD COLUMN "viewers" INTEGER,
  ADD COLUMN "views" INTEGER;

-- CreateIndex
CREATE INDEX "Ad_ad_set_id_idx" ON "Ad"("ad_set_id");
CREATE INDEX "Ad_campaign_id_idx" ON "Ad"("campaign_id");
CREATE INDEX "Ad_reporting_starts_idx" ON "Ad"("reporting_starts");
CREATE UNIQUE INDEX "Ad_ad_id_reporting_starts_key" ON "Ad"("ad_id", "reporting_starts");

-- DropTable: Category no longer relates to Ad (mvp.md §5.1 — content
-- category → ad efficiency is permanently blocked, no join key exists).
-- The Category/Keyword tables themselves are untouched; only the Ad relation
-- goes away (dropped above via the FK + column drop).
