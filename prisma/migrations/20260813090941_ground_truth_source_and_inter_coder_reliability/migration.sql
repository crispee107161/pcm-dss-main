-- CreateEnum
CREATE TYPE "CategoryFinalSource" AS ENUM ('MANUAL_GROUND_TRUTH', 'ACCEPTED_SUGGESTION', 'MANUAL_OVERRIDE');

-- AlterEnum
ALTER TYPE "CategoryLabel" ADD VALUE 'UNCLEAR';

-- DropForeignKey
ALTER TABLE "ManualLabelSample" DROP CONSTRAINT "ManualLabelSample_labeled_by_id_fkey";

-- AlterTable
ALTER TABLE "FacebookPost" ADD COLUMN     "category_final_assigned_at" TIMESTAMP(3),
ADD COLUMN     "category_final_assigned_by_id" INTEGER,
ADD COLUMN     "category_final_source" "CategoryFinalSource";

-- DropTable
DROP TABLE "ManualLabelSample";

-- CreateTable
CREATE TABLE "InterCoderReliability" (
    "id" SERIAL NOT NULL,
    "n" INTEGER NOT NULL,
    "percent_agreement" DOUBLE PRECISION NOT NULL,
    "kappa" DOUBLE PRECISION NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "InterCoderReliability_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_category_final_assigned_by_id_fkey" FOREIGN KEY ("category_final_assigned_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

