/*
  Warnings:

  - You are about to drop the `BotAccounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_botAccountId_fkey";

-- DropForeignKey
ALTER TABLE "BotAccounts" DROP CONSTRAINT "BotAccounts_ownerId_fkey";

-- DropTable
DROP TABLE "BotAccounts";

-- CreateTable
CREATE TABLE "BotAccount" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pfpUrl" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotAccount_slug_key" ON "BotAccount"("slug");

-- CreateIndex
CREATE INDEX "BotAccount_ownerId_idx" ON "BotAccount"("ownerId");

-- CreateIndex
CREATE INDEX "BotAccount_slug_idx" ON "BotAccount"("slug");

-- AddForeignKey
ALTER TABLE "BotAccount" ADD CONSTRAINT "BotAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
