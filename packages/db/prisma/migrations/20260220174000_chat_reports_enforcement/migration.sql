-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'REPORT_REVIEWED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'REPORT_DISMISSED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'REPORT_ENFORCEMENT';

-- CreateEnum
CREATE TYPE "ChatReportAction" AS ENUM (
    'REVIEW',
    'DISMISS',
    'DELETE_REPORTED_MESSAGE',
    'TIMEOUT_10M',
    'TIMEOUT_1H',
    'BAN_CHAT',
    'LIFT_CHAT_BAN',
    'BAN_PLATFORM',
    'UNBAN_PLATFORM'
);

-- AlterTable
ALTER TABLE "ChatUserReport"
ADD COLUMN "handledById" TEXT,
ADD COLUMN "handledAt" TIMESTAMP(3),
ADD COLUMN "handlingNote" TEXT,
ADD COLUMN "lastAction" "ChatReportAction";

-- CreateIndex
CREATE INDEX "ChatUserReport_handledById_handledAt_idx" ON "ChatUserReport"("handledById", "handledAt");

-- AddForeignKey
ALTER TABLE "ChatUserReport" ADD CONSTRAINT "ChatUserReport_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
