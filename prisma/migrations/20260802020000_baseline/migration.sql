-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MARKETING_MANAGER', 'SALES_DIRECTOR', 'BUSINESS_OWNER');

-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('ADS_CSV', 'POSTS_CSV', 'PAGE_METRIC_CSV', 'FOLLOWER_HISTORY_CSV', 'PAGE_VIEWERS_CSV', 'DEMOGRAPHICS_CSV');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "upload_type" "UploadType" NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL,
    "records_inserted" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_unchanged" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookPost" (
    "id" SERIAL NOT NULL,
    "post_id" TEXT NOT NULL,
    "publish_time" TIMESTAMP(3) NOT NULL,
    "post_type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "permalink" TEXT NOT NULL,
    "reach" INTEGER NOT NULL,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL,
    "category_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" SERIAL NOT NULL,
    "reporting_starts" TIMESTAMP(3) NOT NULL,
    "reporting_ends" TIMESTAMP(3) NOT NULL,
    "ad_name" TEXT NOT NULL,
    "ad_set_name" TEXT NOT NULL,
    "attribution_setting" TEXT NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER NOT NULL,
    "link_clicks" INTEGER,
    "amount_spent" DOUBLE PRECISION NOT NULL,
    "total_messaging_contacts" INTEGER,
    "results" INTEGER,
    "cost_per_result" DOUBLE PRECISION,
    "purchases" INTEGER,
    "category_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegressionModel" (
    "id" SERIAL NOT NULL,
    "intercept" DOUBLE PRECISION NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "coef_reach" DOUBLE PRECISION,
    "coef_messaging" DOUBLE PRECISION,
    "coef_amount_spent" DOUBLE PRECISION,
    "coef_spend_sq" DOUBLE PRECISION,
    "coef_link_clicks" DOUBLE PRECISION,
    "model_type" TEXT,
    "residual_std_error" DOUBLE PRECISION,
    "best_lag" INTEGER,
    "r_squared" DOUBLE PRECISION NOT NULL,
    "adj_r_squared" DOUBLE PRECISION,
    "n" INTEGER NOT NULL,
    "trained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationResult" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reach_input" DOUBLE PRECISION,
    "messaging_input" DOUBLE PRECISION,
    "amount_spent_input" DOUBLE PRECISION NOT NULL,
    "projected_purchases" DOUBLE PRECISION NOT NULL,
    "interval_lower" DOUBLE PRECISION,
    "interval_upper" DOUBLE PRECISION,
    "model_id" INTEGER NOT NULL,
    "simulated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageMetricDaily" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "follows" INTEGER,
    "interactions" INTEGER,
    "link_clicks" INTEGER,
    "views" INTEGER,
    "visits" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerHistory" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL,
    "daily_change" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageViewers" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total_viewers" INTEGER,
    "new_viewers" INTEGER NOT NULL,
    "returning_viewers" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageViewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerGender" (
    "id" SERIAL NOT NULL,
    "gender" TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FollowerGender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerTerritory" (
    "id" SERIAL NOT NULL,
    "territory" TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FollowerTerritory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPost_post_id_key" ON "FacebookPost"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_ad_name_reporting_starts_key" ON "Ad"("ad_name", "reporting_starts");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_word_key" ON "Keyword"("word");

-- CreateIndex
CREATE UNIQUE INDEX "PageMetricDaily_date_key" ON "PageMetricDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerHistory_date_key" ON "FollowerHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewers_date_key" ON "PageViewers"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerGender_gender_key" ON "FollowerGender"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerTerritory_territory_key" ON "FollowerTerritory"("territory");

-- AddForeignKey
ALTER TABLE "UploadLog" ADD CONSTRAINT "UploadLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
