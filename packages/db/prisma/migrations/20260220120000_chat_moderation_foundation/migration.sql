-- CreateEnum
CREATE TYPE "ChatModerationAction" AS ENUM (
    'MESSAGE_BLOCKED',
    'MESSAGE_DELETED',
    'USER_TIMEOUT',
    'USER_BANNED',
    'USER_UNBANNED'
);

-- CreateTable
CREATE TABLE "ChatModerationSettings" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "blockedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slowModeSeconds" INTEGER NOT NULL DEFAULT 0,
    "maxMessageLength" INTEGER NOT NULL DEFAULT 400,
    "rateLimitCount" INTEGER NOT NULL DEFAULT 8,
    "rateLimitWindowSeconds" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatModerationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatUserBan" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatUserBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatModerationEvent" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "action" "ChatModerationAction" NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatModerationSettings_channelId_key" ON "ChatModerationSettings"("channelId");

-- CreateIndex
CREATE INDEX "ChatModerationSettings_channelId_idx" ON "ChatModerationSettings"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatUserBan_channelId_userId_key" ON "ChatUserBan"("channelId", "userId");

-- CreateIndex
CREATE INDEX "ChatUserBan_channelId_userId_idx" ON "ChatUserBan"("channelId", "userId");

-- CreateIndex
CREATE INDEX "ChatUserBan_expiresAt_idx" ON "ChatUserBan"("expiresAt");

-- CreateIndex
CREATE INDEX "ChatModerationEvent_channelId_createdAt_idx" ON "ChatModerationEvent"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatModerationEvent_moderatorId_idx" ON "ChatModerationEvent"("moderatorId");

-- CreateIndex
CREATE INDEX "ChatModerationEvent_targetUserId_idx" ON "ChatModerationEvent"("targetUserId");

-- AddForeignKey
ALTER TABLE "ChatModerationSettings" ADD CONSTRAINT "ChatModerationSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUserBan" ADD CONSTRAINT "ChatUserBan_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUserBan" ADD CONSTRAINT "ChatUserBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUserBan" ADD CONSTRAINT "ChatUserBan_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationEvent" ADD CONSTRAINT "ChatModerationEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationEvent" ADD CONSTRAINT "ChatModerationEvent_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModerationEvent" ADD CONSTRAINT "ChatModerationEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
