-- AlterTable
ALTER TABLE "FacebookPost" ADD COLUMN     "category_pending" "CategoryLabel",
ADD COLUMN     "category_pending_by" INTEGER;

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_category_pending_by_fkey" FOREIGN KEY ("category_pending_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
