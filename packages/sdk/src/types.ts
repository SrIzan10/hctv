export interface ChatMessage {
  id: string;
  msgId?: string;
  channelName: string;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  message: string;
  timestamp: number;
  type: 'message' | 'systemMsg';
  isBot: boolean;
}

export interface SystemMessage {
  type: 'connected' | 'disconnected' | 'error';
  channelName: string;
  message: string;
  timestamp: number;
}

/** Message format received from the server */
export interface ServerChatMessage {
  user: {
    id: string;
    username: string;
    pfpUrl: string;
    displayName?: string;
    isBot?: boolean;
  };
  message: string;
  msgId?: string;
  type?: 'message' | 'systemMsg';
}

export interface ChatAccessState {
  canSend: boolean;
  restriction?: {
    type: 'timeout' | 'ban';
    reason?: string;
    expiresAt?: string | null;
  } | null;
}

export interface ModerationError {
  code: string;
  message: string;
  restriction?: ChatAccessState['restriction'];
}

export interface ModerationEvent {
  type: 'messageDeleted';
  msgId: string;
  channelName: string;
}

export interface ModerationCommand {
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

export type MessageHandler = (message: ChatMessage) => void;
export type SystemMessageHandler = (message: SystemMessage) => void;
export type HistoryHandler = (messages: ChatMessage[]) => void;
export type ChatAccessHandler = (state: ChatAccessState, channelName: string) => void;
export type ModerationErrorHandler = (error: ModerationError, channelName: string) => void;
export type ModerationEventHandler = (event: ModerationEvent) => void;
