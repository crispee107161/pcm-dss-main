-- CreateTable
CREATE TABLE "ManualLabelSample" (
    "id" SERIAL NOT NULL,
    "facebook_post_id" INTEGER NOT NULL,
    "category_manual" "CategoryLabel",
    "labeled_by_id" INTEGER,
    "sampled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "labeled_at" TIMESTAMP(3),

    CONSTRAINT "ManualLabelSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualLabelSample_facebook_post_id_key" ON "ManualLabelSample"("facebook_post_id");

-- CreateIndex
CREATE INDEX "ManualLabelSample_category_manual_idx" ON "ManualLabelSample"("category_manual");

-- AddForeignKey
ALTER TABLE "ManualLabelSample" ADD CONSTRAINT "ManualLabelSample_labeled_by_id_fkey" FOREIGN KEY ("labeled_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
