import type { Peer } from 'crossws';

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

/**
 * Per-connection state. Wraps a crossws peer so the moderation helpers keep the
 * same `send`/`close` surface they had with the old `ws` sockets.
 */
export interface ChatSocket {
  peer: Peer;
  send: (data: string) => void;
  close: () => void;
  isOpen: () => boolean;
  targetUsername?: string;
  channelId?: string;
  chatUser?: ChatUser | null;
  personalChannel?: any;
  viewerId?: string;
  isModerator?: boolean;
  metricsTracked?: boolean;
  metricsAuthMethod?: string;
  excludeFromViewerCount?: boolean;
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
