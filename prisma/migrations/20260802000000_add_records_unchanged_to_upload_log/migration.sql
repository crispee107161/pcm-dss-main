-- AlterTable: track rows whose fields already matched the incoming CSV (no-op upserts)
ALTER TABLE "UploadLog" ADD COLUMN "records_unchanged" INTEGER NOT NULL DEFAULT 0;
