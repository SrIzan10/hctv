-- AlterTable
ALTER TABLE "Follow" ALTER COLUMN "notifyStream" SET DEFAULT false;

UPDATE "Follow" SET "notifyStream" = false;