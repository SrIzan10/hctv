-- CreateTable
CREATE TABLE "_ChannelChatModerators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChannelChatModerators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChannelChatBotModerators" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChannelChatBotModerators_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChannelChatModerators_B_index" ON "_ChannelChatModerators"("B");

-- CreateIndex
CREATE INDEX "_ChannelChatBotModerators_B_index" ON "_ChannelChatBotModerators"("B");

-- AddForeignKey
ALTER TABLE "_ChannelChatModerators" ADD CONSTRAINT "_ChannelChatModerators_A_fkey" FOREIGN KEY ("A") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelChatModerators" ADD CONSTRAINT "_ChannelChatModerators_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelChatBotModerators" ADD CONSTRAINT "_ChannelChatBotModerators_A_fkey" FOREIGN KEY ("A") REFERENCES "BotAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChannelChatBotModerators" ADD CONSTRAINT "_ChannelChatBotModerators_B_fkey" FOREIGN KEY ("B") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
