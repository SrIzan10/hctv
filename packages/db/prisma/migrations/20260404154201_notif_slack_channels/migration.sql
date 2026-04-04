-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "notifChannels" TEXT[] DEFAULT ARRAY[]::TEXT[];
