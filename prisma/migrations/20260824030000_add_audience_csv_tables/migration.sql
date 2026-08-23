-- AlterEnum
ALTER TYPE "UploadType" ADD VALUE 'AUDIENCE_CSV';

-- CreateTable
CREATE TABLE "FollowerAgeGender" (
    "id" SERIAL NOT NULL,
    "age_bracket" TEXT NOT NULL,
    "men_distribution" DOUBLE PRECISION NOT NULL,
    "women_distribution" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FollowerAgeGender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerAudienceRank" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FollowerAudienceRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowerAgeGender_age_bracket_key" ON "FollowerAgeGender"("age_bracket");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerAudienceRank_category_label_key" ON "FollowerAudienceRank"("category", "label");
