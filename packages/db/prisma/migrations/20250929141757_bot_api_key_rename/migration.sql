/*
  Warnings:

  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_botAccountId_fkey";

-- DropTable
DROP TABLE "ApiKey";

-- CreateTable
CREATE TABLE "BotApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "botAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotApiKey_key_key" ON "BotApiKey"("key");

-- CreateIndex
CREATE INDEX "BotApiKey_botAccountId_idx" ON "BotApiKey"("botAccountId");

-- AddForeignKey
ALTER TABLE "BotApiKey" ADD CONSTRAINT "BotApiKey_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
