-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "hackClubVerificationCheckedAt" TIMESTAMP(3),
ADD COLUMN     "hackClubVerificationResult" TEXT;
