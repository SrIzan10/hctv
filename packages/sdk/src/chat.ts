// most code here has been written by claude opus 4.5
import type {
  ChatMessage,
  HistoryHandler,
  MessageHandler,
  ServerChatMessage,
  SystemMessage,
  SystemMessageHandler,
} from './types';

const DEFAULT_BASE_URL = 'wss://hackclub.tv/api/stream/chat/ws';
const PING_INTERVAL = 20000; // 20 seconds

export class ChatClient {
  private botToken: string;
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private systemMessageHandlers: Set<SystemMessageHandler> = new Set();
  private historyHandlers: Set<HistoryHandler> = new Set();
  private channelName: string | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(botToken: string, options?: ChatClientOptions) {
    this.botToken = botToken;
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  }

  async connect(channelName: string): Promise<void> {
    if (this.isConnected) {
      return Promise.reject(new Error('already connected, please disconnect from it first'));
    }

    this.channelName = channelName;
    const wsUrl = `${this.baseUrl}/${channelName}?botAuth=${this.botToken}`;
    
    if (typeof process !== 'undefined' && process.versions?.node) {
      const { default: WebSocket } = await import('ws');
      this.ws = new WebSocket(wsUrl) as any;
    } else {
      this.ws = new WebSocket(wsUrl);
    }
    
    return this.setupWebSocket(channelName);
  }

  private setupWebSocket(channelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.emit('system', {
          type: 'connected',
          channelName,
          message: 'Connected',
          timestamp: Date.now(),
        });
        this.startPingInterval();
        resolve();
      };

      this.ws!.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        this.handleMessage(data, channelName);
      };

      this.ws!.onerror = () => {
        this.emit('system', {
          type: 'error',
          channelName,
          message: 'WebSocket error',
          timestamp: Date.now(),
        });
        reject(new Error('WebSocket error'));
      };

      this.ws!.onclose = () => {
        this.stopPingInterval();
        this.emit('system', {
          type: 'disconnected',
          channelName,
          message: 'Disconnected',
          timestamp: Date.now(),
        });
        this.ws = null;
      };
    });
  }

  private handleMessage(data: any, channelName: string): void {
    // Handle pong response
    if (data.type === 'pong') {
      return;
    }

    // Handle history messages (sent on connection)
    if (data.type === 'history' && Array.isArray(data.messages)) {
      const messages: ChatMessage[] = data.messages.map((msg: ServerChatMessage) =>
        this.parseServerMessage(msg, channelName)
      );
      this.historyHandlers.forEach((handler) => handler(messages));
      return;
    }

    // Handle regular chat messages
    // Server sends: { user: { id, username, pfpUrl, displayName?, isBot }, message }
    if (data.user && typeof data.message === 'string') {
      const chatMessage = this.parseServerMessage(data, channelName);
      this.emit('message', chatMessage);
      return;
    }

    // Handle emoji responses
    if (data.type === 'emojiMsgResponse' || data.type === 'emojiSearchResponse') {
      // Could add emoji handlers in the future
      return;
    }
  }

  private parseServerMessage(msg: ServerChatMessage, channelName: string): ChatMessage {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      channelName,
      username: msg.user.username,
      displayName: msg.user.displayName,
      pfpUrl: msg.user.pfpUrl,
      message: msg.message,
      timestamp: Date.now(),
      type: msg.type === 'systemMsg' ? 'systemMsg' : 'message',
      isBot: msg.user.isBot || false,
    };
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.ws!.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect(): void {
    this.stopPingInterval();
    this.ws?.close();
    this.ws = null;
    this.channelName = null;
  }

  sendMessage(message: string): void {
    if (!this.isConnected) {
      throw new Error('Not connected to a channel');
    }
    this.ws!.send(JSON.stringify({ type: 'message', message }));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onSystemMessage(handler: SystemMessageHandler): () => void {
    this.systemMessageHandlers.add(handler);
    return () => this.systemMessageHandlers.delete(handler);
  }

  onHistory(handler: HistoryHandler): () => void {
    this.historyHandlers.add(handler);
    return () => this.historyHandlers.delete(handler);
  }

  private emit(type: 'message', data: ChatMessage): void;
  private emit(type: 'system', data: SystemMessage): void;
  private emit(type: 'message' | 'system', data: ChatMessage | SystemMessage): void {
    const handlers = type === 'message' ? this.messageHandlers : this.systemMessageHandlers;
    handlers.forEach((handler) => handler(data as any));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get currentChannel(): string | null {
    return this.channelName;
  }
}

export interface ChatClientOptions {
  /** Custom WebSocket base URL (default: wss://hackclub.tv/api/chat) */
  baseUrl?: string;
}
