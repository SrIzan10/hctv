/*
  Warnings:

  - A unique constraint covering the columns `[obsChatGrantToken]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.
  - The required column `obsChatGrantToken` was added to the `Channel` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable: add column as nullable first
ALTER TABLE "Channel" ADD COLUMN "obsChatGrantToken" TEXT;

-- Update: set random string for existing rows
UPDATE "Channel"
SET "obsChatGrantToken" = substr(md5(random()::text || clock_timestamp()::text), 1, 32)
WHERE "obsChatGrantToken" IS NULL;

-- AlterTable: make column NOT NULL
ALTER TABLE "Channel" ALTER COLUMN "obsChatGrantToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_obsChatGrantToken_key" ON "Channel"("obsChatGrantToken");
