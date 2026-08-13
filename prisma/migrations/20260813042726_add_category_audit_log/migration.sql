-- CreateEnum
CREATE TYPE "CategoryAuditAction" AS ENUM ('PROPOSE', 'ACCEPT', 'REJECT', 'OVERRIDE', 'BULK_ACCEPT');

-- CreateTable
CREATE TABLE "CategoryAuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" "CategoryAuditAction" NOT NULL,
    "facebook_post_id" INTEGER NOT NULL,
    "previous_category" "CategoryLabel",
    "new_category" "CategoryLabel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryAuditLog_created_at_idx" ON "CategoryAuditLog"("created_at");

-- AddForeignKey
ALTER TABLE "CategoryAuditLog" ADD CONSTRAINT "CategoryAuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
