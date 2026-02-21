-- CreateEnum
CREATE TYPE "ChatReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ChatUserReport" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetUsername" TEXT,
    "reportedMessage" TEXT,
    "reportedMessageId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ChatReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatUserReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatUserReport_channelId_createdAt_idx" ON "ChatUserReport"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatUserReport_reporterId_createdAt_idx" ON "ChatUserReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatUserReport_status_createdAt_idx" ON "ChatUserReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatUserReport" ADD CONSTRAINT "ChatUserReport_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUserReport" ADD CONSTRAINT "ChatUserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUserReport" ADD CONSTRAINT "ChatUserReport_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
