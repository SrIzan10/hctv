/*
  Warnings:

  - You are about to drop the column `channelId` on the `BotAccounts` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `BotAccounts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BotAccounts" DROP CONSTRAINT "BotAccounts_channelId_fkey";

-- DropIndex
DROP INDEX "BotAccounts_channelId_idx";

-- AlterTable
ALTER TABLE "BotAccounts" DROP COLUMN "channelId",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BotAccounts_ownerId_idx" ON "BotAccounts"("ownerId");

-- AddForeignKey
ALTER TABLE "BotAccounts" ADD CONSTRAINT "BotAccounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
