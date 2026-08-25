-- AlterEnum
ALTER TYPE "CategoryFinalSource" ADD VALUE 'MANUAL_CODEBOOK_ASSIGNMENT';

-- AlterTable
ALTER TABLE "FollowerAgeGender" ALTER COLUMN "captured_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FollowerAudienceRank" ALTER COLUMN "captured_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FollowerGender" ALTER COLUMN "captured_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FollowerTerritory" ALTER COLUMN "captured_at" DROP DEFAULT;
