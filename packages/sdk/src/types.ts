export interface ChatMessage {
  id: string;
  channelName: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'message' | 'systemMsg';
}

export interface SystemMessage {
  type: 'connected' | 'disconnected' | 'error';
  channelName: string;
  message: string;
  timestamp: number;
}

export type MessageHandler = (message: ChatMessage) => void;
export type SystemMessageHandler = (message: SystemMessage) => void;
