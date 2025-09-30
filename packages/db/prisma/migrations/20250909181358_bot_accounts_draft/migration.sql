-- CreateTable
CREATE TABLE "BotAccounts" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pfpUrl" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "BotAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotAccounts_slug_key" ON "BotAccounts"("slug");

-- CreateIndex
CREATE INDEX "BotAccounts_channelId_idx" ON "BotAccounts"("channelId");

-- CreateIndex
CREATE INDEX "BotAccounts_slug_idx" ON "BotAccounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_botAccountId_idx" ON "ApiKey"("botAccountId");

-- AddForeignKey
ALTER TABLE "BotAccounts" ADD CONSTRAINT "BotAccounts_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
