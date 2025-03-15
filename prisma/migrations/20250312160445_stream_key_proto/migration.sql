-- CreateTable
CREATE TABLE "StreamKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "StreamKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamKey_key_key" ON "StreamKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "StreamKey_channelId_key" ON "StreamKey"("channelId");

-- AddForeignKey
ALTER TABLE "StreamKey" ADD CONSTRAINT "StreamKey_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
