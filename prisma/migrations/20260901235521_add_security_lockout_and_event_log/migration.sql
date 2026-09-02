-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('SIGN_IN_SUCCESS', 'SIGN_IN_FAILURE', 'SIGN_OUT', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_CREATED', 'ROLE_CHANGED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'AUTHORIZATION_DENIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_failed_login_at" TIMESTAMP(3),
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temp_password_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SecurityEventLog" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" "SecurityEventType" NOT NULL,
    "user_id" INTEGER,
    "actor_email" TEXT,
    "target_user_id" INTEGER,
    "outcome" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "SecurityEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEventLog_at_idx" ON "SecurityEventLog"("at");

-- CreateIndex
CREATE INDEX "SecurityEventLog_user_id_idx" ON "SecurityEventLog"("user_id");

-- AddForeignKey
ALTER TABLE "SecurityEventLog" ADD CONSTRAINT "SecurityEventLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
