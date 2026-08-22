-- CreateEnum
CREATE TYPE "CategoryFlagReason" AS ENUM ('DISAGREEMENT', 'UNCLASSIFIED', 'RARE_CATEGORY', 'SHORT_CAPTION');

-- AlterEnum
ALTER TYPE "CategoryAuditAction" ADD VALUE 'BATCH_CONFIRM';

-- AlterTable
ALTER TABLE "FacebookPost" ADD COLUMN     "category_flag_reasons" "CategoryFlagReason"[] DEFAULT ARRAY[]::"CategoryFlagReason"[];
