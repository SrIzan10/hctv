-- CreateTable
CREATE TABLE "StreamInfo" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "viewers" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamInfo_username_key" ON "StreamInfo"("username");
