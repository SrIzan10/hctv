-- CreateTable
CREATE TABLE "MultistreamDestination" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "streamKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "MultistreamDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MultistreamDestination_channelId_idx" ON "MultistreamDestination"("channelId");

-- AddForeignKey
ALTER TABLE "MultistreamDestination" ADD CONSTRAINT "MultistreamDestination_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
