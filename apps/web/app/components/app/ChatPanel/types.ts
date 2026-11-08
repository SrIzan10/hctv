export interface ChatMessage {
  user?: User;
  message: string;
  type: 'message' | 'systemMsg';
  msgId?: string;
}

export interface ChatModerationCommand {
  type:
    | 'mod:deleteMessage'
    | 'mod:timeoutUser'
    | 'mod:banUser'
    | 'mod:unbanUser'
    | 'mod:liftTimeout';
  msgId?: string;
  targetUserId?: string;
  targetUsername?: string;
  durationSeconds?: number;
  reason?: string;
}

export interface ChatAccessState {
  canSend: boolean;
  restriction: ChatRestriction | null;
}

export interface ChatRestriction {
  type: 'timeout' | 'ban';
  reason?: string;
  expiresAt?: string | null;
}

export interface User {
  id: string;
  username: string;
  pfpUrl: string;
  isBot: boolean;
  displayName?: string;
  isPlatformAdmin?: boolean;
  channelRole?: 'owner' | 'manager' | 'chatModerator' | 'botModerator' | null;
}
