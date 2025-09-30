/*
  Warnings:

  - Added the required column `name` to the `BotApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BotApiKey" ADD COLUMN     "name" TEXT NOT NULL;
