/*
  Warnings:

  - You are about to drop the column `pfpUrl` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personalChannelId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pfpUrl` to the `Channel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "pfpUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pfpUrl",
ADD COLUMN     "personalChannelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_personalChannelId_key" ON "User"("personalChannelId");

-- CreateIndex
CREATE INDEX "User_personalChannelId_idx" ON "User"("personalChannelId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personalChannelId_fkey" FOREIGN KEY ("personalChannelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
