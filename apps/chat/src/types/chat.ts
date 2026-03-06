import type { ModifiedWebSocket } from '@hctv/hono-ws';

export interface ChatUser {
  id: string;
  username: string;
  pfpUrl: string;
  displayName?: string;
  isBot: boolean;
  moderatorUserId: string;
  isPlatformAdmin: boolean;
  channelRole: 'owner' | 'manager' | 'chatModerator' | 'botModerator' | null;
}

export interface ChatModerationSettingsShape {
  blockedTerms: string[];
  slowModeSeconds: number;
  maxMessageLength: number;
  rateLimitCount: number;
  rateLimitWindowSeconds: number;
}

export interface ChatRestrictionState {
  type: 'timeout' | 'ban';
  reason: string;
  expiresAt: Date | null;
}

export interface ChatSocket {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
  close: () => void;
  wss: {
    clients: Set<unknown>;
  };
  targetUsername?: string;
  channelId?: string;
  chatUser?: ChatUser | null;
  personalChannel?: any;
  viewerId?: string;
  isModerator?: boolean;
  excludeFromViewerCount?: boolean;
  raw?:
    | (ModifiedWebSocket & {
        targetUsername?: string;
        channelId?: string;
        chatUser?: ChatUser | null;
        personalChannel?: any;
        isModerator?: boolean;
        excludeFromViewerCount?: boolean;
      })
    | null;
}

export type ChatModerationCommand = {
  type:
    | 'mod:deleteMessage'
    | 'mod:timeoutUser'
    | 'mod:banUser'
    | 'mod:unbanUser'
    | 'mod:liftTimeout';
  msgId?: string;
  targetUserId?: string;
  durationSeconds?: number;
  reason?: string;
};
