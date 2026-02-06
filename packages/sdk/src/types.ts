export interface ChatMessage {
  id: string;
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
  type?: 'message' | 'systemMsg';
}

export type MessageHandler = (message: ChatMessage) => void;
export type SystemMessageHandler = (message: SystemMessage) => void;
export type HistoryHandler = (messages: ChatMessage[]) => void;
