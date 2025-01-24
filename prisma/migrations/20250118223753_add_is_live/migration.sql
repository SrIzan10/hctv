/*
  Warnings:

  - Added the required column `isLive` to the `StreamInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StreamInfo" ADD COLUMN     "isLive" BOOLEAN NOT NULL;
