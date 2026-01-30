// most code here has been written by claude opus 4.5
import type { ChatMessage, MessageHandler, SystemMessage, SystemMessageHandler } from './types';

export class ChatClient {
  private botToken: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private systemMessageHandlers: Set<SystemMessageHandler> = new Set();
  private channelName: string | null = null;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  connect(channelName: string): Promise<void> {
    if (this.isConnected) {
      return Promise.reject(new Error('Already connected. Disconnect first.'));
    }

    this.channelName = channelName;
    const wsUrl = `${process.env.CHAT_WS_URL || 'ws://localhost:3001'}/ws`;
    this.ws = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => {
        this.ws!.send(JSON.stringify({ type: 'auth', token: this.botToken, channelName }));
        this.emit('system', { type: 'connected', channelName, message: `Connected to ${channelName}`, timestamp: Date.now() });
        resolve();
      };

      this.ws!.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && typeof data.message === 'string') {
          this.emit('message', {
            id: data.id || `${Date.now()}-${Math.random()}`,
            channelName: data.channelName || channelName,
            username: data.username || data.user?.username || 'Unknown',
            message: data.message,
            timestamp: data.timestamp || Date.now(),
            type: data.messageType || 'message',
          });
        }
      };

      this.ws!.onerror = () => {
        this.emit('system', { type: 'error', channelName, message: 'WebSocket error', timestamp: Date.now() });
        reject(new Error('WebSocket error'));
      };

      this.ws!.onclose = () => {
        this.emit('system', { type: 'disconnected', channelName, message: 'Disconnected', timestamp: Date.now() });
        this.ws = null;
      };
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.channelName = null;
  }

  sendMessage(message: string): void {
    if (!this.isConnected) {
      throw new Error('Not connected to a channel');
    }
    this.ws!.send(JSON.stringify({ type: 'message', message, channelName: this.channelName }));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onSystemMessage(handler: SystemMessageHandler): () => void {
    this.systemMessageHandlers.add(handler);
    return () => this.systemMessageHandlers.delete(handler);
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
