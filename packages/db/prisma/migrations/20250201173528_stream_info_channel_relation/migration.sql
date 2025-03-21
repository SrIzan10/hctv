/*
  Warnings:

  - Added the required column `channelId` to the `StreamInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StreamInfo" ADD COLUMN     "channelId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "StreamInfo" ADD CONSTRAINT "StreamInfo_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
