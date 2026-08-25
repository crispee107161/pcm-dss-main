-- AlterTable
ALTER TABLE "UploadLog" ADD COLUMN "records_rejected" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UploadLog" ADD COLUMN "rejected_reasons" TEXT;
