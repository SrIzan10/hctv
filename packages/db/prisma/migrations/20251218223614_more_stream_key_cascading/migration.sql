-- DropForeignKey
ALTER TABLE "StreamKey" DROP CONSTRAINT "StreamKey_channelId_fkey";

-- AddForeignKey
ALTER TABLE "StreamKey" ADD CONSTRAINT "StreamKey_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
