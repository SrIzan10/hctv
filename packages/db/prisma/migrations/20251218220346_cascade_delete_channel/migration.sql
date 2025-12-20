-- DropForeignKey
ALTER TABLE "StreamInfo" DROP CONSTRAINT "StreamInfo_channelId_fkey";

-- AddForeignKey
ALTER TABLE "StreamInfo" ADD CONSTRAINT "StreamInfo_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
