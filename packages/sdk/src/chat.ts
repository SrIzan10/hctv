// most code here has been written by claude opus 4.5
import type {
  ChatAccessHandler,
  ChatAccessState,
  ChatMessage,
  HistoryHandler,
  MessageHandler,
  ModerationCommand,
  ModerationError,
  ModerationErrorHandler,
  ModerationEvent,
  ModerationEventHandler,
  ServerChatMessage,
  SystemMessage,
  SystemMessageHandler,
} from './types';

const DEFAULT_BASE_URL = 'wss://hackclub.tv/api/stream/chat/ws';
const PING_INTERVAL = 20000; // 20 seconds

interface ChannelConnection {
  ws: WebSocket;
  pingInterval: ReturnType<typeof setInterval>;
  messageHandlers: Set<MessageHandler>;
  systemMessageHandlers: Set<SystemMessageHandler>;
  historyHandlers: Set<HistoryHandler>;
  moderationErrorHandlers: Set<ModerationErrorHandler>;
  moderationEventHandlers: Set<ModerationEventHandler>;
  chatAccessHandlers: Set<ChatAccessHandler>;
}

export class ChatClient {
  private botToken: string;
  private baseUrl: string;
  private connections: Map<string, ChannelConnection> = new Map();
  // Global handlers (receive messages from all channels)
  private globalMessageHandlers: Set<MessageHandler> = new Set();
  private globalSystemMessageHandlers: Set<SystemMessageHandler> = new Set();
  private globalHistoryHandlers: Set<HistoryHandler> = new Set();
  private globalModerationErrorHandlers: Set<ModerationErrorHandler> = new Set();
  private globalModerationEventHandlers: Set<ModerationEventHandler> = new Set();
  private globalChatAccessHandlers: Set<ChatAccessHandler> = new Set();

  constructor(botToken: string, options?: ChatClientOptions) {
    this.botToken = botToken;
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  }

  async connect(channelName: string): Promise<void> {
    if (this.connections.has(channelName)) {
      return Promise.reject(new Error(`already connected to channel: ${channelName}`));
    }

    const wsUrl = `${this.baseUrl}/${channelName}?botAuth=${this.botToken}`;

    let ws: WebSocket;
    if (typeof process !== 'undefined' && process.versions?.node) {
      const { default: WebSocket } = await import('ws');
      ws = new WebSocket(wsUrl) as any;
    } else {
      ws = new WebSocket(wsUrl);
    }

    const connection: ChannelConnection = {
      ws,
      pingInterval: null as any,
      messageHandlers: new Set(),
      systemMessageHandlers: new Set(),
      historyHandlers: new Set(),
      moderationErrorHandlers: new Set(),
      moderationEventHandlers: new Set(),
      chatAccessHandlers: new Set(),
    };

    this.connections.set(channelName, connection);

    return this.setupWebSocket(channelName, connection);
  }

  private setupWebSocket(channelName: string, connection: ChannelConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      connection.ws.onopen = () => {
        const systemMsg: SystemMessage = {
          type: 'connected',
          channelName,
          message: 'Connected',
          timestamp: Date.now(),
        };
        this.emitSystem(systemMsg, connection);
        this.startPingInterval(channelName, connection);
        resolve();
      };

      connection.ws.onmessage = (event) => {
        const data = JSON.parse(event.data.toString());
        this.handleMessage(data, channelName, connection);
      };

      connection.ws.onerror = () => {
        const systemMsg: SystemMessage = {
          type: 'error',
          channelName,
          message: 'WebSocket error',
          timestamp: Date.now(),
        };
        this.emitSystem(systemMsg, connection);
        reject(new Error('WebSocket error'));
      };

      connection.ws.onclose = () => {
        this.stopPingInterval(connection);
        const systemMsg: SystemMessage = {
          type: 'disconnected',
          channelName,
          message: 'Disconnected',
          timestamp: Date.now(),
        };
        this.emitSystem(systemMsg, connection);
        this.connections.delete(channelName);
      };
    });
  }

  private handleMessage(data: any, channelName: string, connection: ChannelConnection): void {
    // Handle pong response
    if (data.type === 'pong') {
      return;
    }

    // Handle history messages (sent on connection)
    if (data.type === 'history' && Array.isArray(data.messages)) {
      const messages: ChatMessage[] = data.messages.map((msg: ServerChatMessage) =>
        this.parseServerMessage(msg, channelName)
      );
      // Emit to channel-specific handlers
      connection.historyHandlers.forEach((handler) => handler(messages));
      // Emit to global handlers
      this.globalHistoryHandlers.forEach((handler) => handler(messages));
      return;
    }

    // Handle regular chat messages
    // Server sends: { user: { id, username, pfpUrl, displayName?, isBot }, message }
    if (data.user && typeof data.message === 'string') {
      const chatMessage = this.parseServerMessage(data, channelName);
      this.emitMessage(chatMessage, connection);
      return;
    }

    if (data.type === 'chatAccess') {
      const access: ChatAccessState = {
        canSend: Boolean(data.canSend),
        restriction: data.restriction ?? null,
      };
      this.emitChatAccess(access, channelName, connection);
      return;
    }

    if (data.type === 'moderationError') {
      const error: ModerationError = {
        code: data.code,
        message: data.message,
        restriction: data.restriction,
      };
      this.emitModerationError(error, channelName, connection);
      return;
    }

    if (data.type === 'messageDeleted' && typeof data.msgId === 'string') {
      const event: ModerationEvent = {
        type: 'messageDeleted',
        msgId: data.msgId,
        channelName,
      };
      this.emitModerationEvent(event, connection);
      return;
    }

    if (data.type === 'systemMsg' && typeof data.message === 'string') {
      const systemMsg: SystemMessage = {
        type: 'connected',
        channelName,
        message: data.message,
        timestamp: Date.now(),
      };
      this.emitSystem(systemMsg, connection);
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
      msgId: msg.msgId,
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

  private startPingInterval(channelName: string, connection: ChannelConnection): void {
    connection.pingInterval = setInterval(() => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }

  private stopPingInterval(connection: ChannelConnection): void {
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }
  }

  disconnect(channelName?: string): void {
    if (channelName) {
      // Disconnect specific channel
      const connection = this.connections.get(channelName);
      if (connection) {
        this.stopPingInterval(connection);
        connection.ws.close();
        this.connections.delete(channelName);
      }
    } else {
      // Disconnect all channels
      for (const [name, connection] of this.connections) {
        this.stopPingInterval(connection);
        connection.ws.close();
      }
      this.connections.clear();
    }
  }

  sendMessage(message: string, channelName?: string): void {
    if (channelName) {
      // Send to specific channel
      const connection = this.connections.get(channelName);
      if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.ws.send(JSON.stringify({ type: 'message', message }));
    } else {
      // Send to first connected channel (backward compatibility)
      const firstConnection = Array.from(this.connections.values())[0];
      if (!firstConnection || firstConnection.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to any channel');
      }
      firstConnection.ws.send(JSON.stringify({ type: 'message', message }));
    }
  }

  sendModerationCommand(command: ModerationCommand, channelName: string): void {
    const connection = this.connections.get(channelName);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Not connected to channel: ${channelName}`);
    }
    connection.ws.send(JSON.stringify(command));
  }

  timeoutUser(
    channelName: string,
    targetUserId: string,
    targetUsername: string,
    durationSeconds = 300
  ): void {
    this.sendModerationCommand(
      {
        type: 'mod:timeoutUser',
        targetUserId,
        targetUsername,
        durationSeconds,
      },
      channelName
    );
  }

  banUser(
    channelName: string,
    targetUserId: string,
    targetUsername: string,
    reason?: string
  ): void {
    this.sendModerationCommand(
      {
        type: 'mod:banUser',
        targetUserId,
        targetUsername,
        reason,
      },
      channelName
    );
  }

  liftTimeout(channelName: string, targetUserId: string, targetUsername: string): void {
    this.sendModerationCommand(
      {
        type: 'mod:liftTimeout',
        targetUserId,
        targetUsername,
      },
      channelName
    );
  }

  onMessage(handler: MessageHandler, channelName?: string): () => void {
    if (channelName) {
      // Channel-specific handler
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.messageHandlers.add(handler);
      return () => connection.messageHandlers.delete(handler);
    } else {
      // Global handler (receives from all channels)
      this.globalMessageHandlers.add(handler);
      return () => this.globalMessageHandlers.delete(handler);
    }
  }

  onSystemMessage(handler: SystemMessageHandler, channelName?: string): () => void {
    if (channelName) {
      // Channel-specific handler
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.systemMessageHandlers.add(handler);
      return () => connection.systemMessageHandlers.delete(handler);
    } else {
      // Global handler (receives from all channels)
      this.globalSystemMessageHandlers.add(handler);
      return () => this.globalSystemMessageHandlers.delete(handler);
    }
  }

  onHistory(handler: HistoryHandler, channelName?: string): () => void {
    if (channelName) {
      // Channel-specific handler
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.historyHandlers.add(handler);
      return () => connection.historyHandlers.delete(handler);
    } else {
      // Global handler (receives from all channels)
      this.globalHistoryHandlers.add(handler);
      return () => this.globalHistoryHandlers.delete(handler);
    }
  }

  onModerationError(handler: ModerationErrorHandler, channelName?: string): () => void {
    if (channelName) {
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.moderationErrorHandlers.add(handler);
      return () => connection.moderationErrorHandlers.delete(handler);
    }

    this.globalModerationErrorHandlers.add(handler);
    return () => this.globalModerationErrorHandlers.delete(handler);
  }

  onModerationEvent(handler: ModerationEventHandler, channelName?: string): () => void {
    if (channelName) {
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.moderationEventHandlers.add(handler);
      return () => connection.moderationEventHandlers.delete(handler);
    }

    this.globalModerationEventHandlers.add(handler);
    return () => this.globalModerationEventHandlers.delete(handler);
  }

  onChatAccess(handler: ChatAccessHandler, channelName?: string): () => void {
    if (channelName) {
      const connection = this.connections.get(channelName);
      if (!connection) {
        throw new Error(`Not connected to channel: ${channelName}`);
      }
      connection.chatAccessHandlers.add(handler);
      return () => connection.chatAccessHandlers.delete(handler);
    }

    this.globalChatAccessHandlers.add(handler);
    return () => this.globalChatAccessHandlers.delete(handler);
  }

  private emitMessage(message: ChatMessage, connection: ChannelConnection): void {
    // Emit to channel-specific handlers
    connection.messageHandlers.forEach((handler) => handler(message));
    // Emit to global handlers
    this.globalMessageHandlers.forEach((handler) => handler(message));
  }

  private emitSystem(message: SystemMessage, connection: ChannelConnection): void {
    // Emit to channel-specific handlers
    connection.systemMessageHandlers.forEach((handler) => handler(message));
    // Emit to global handlers
    this.globalSystemMessageHandlers.forEach((handler) => handler(message));
  }

  private emitModerationError(
    error: ModerationError,
    channelName: string,
    connection: ChannelConnection
  ): void {
    connection.moderationErrorHandlers.forEach((handler) => handler(error, channelName));
    this.globalModerationErrorHandlers.forEach((handler) => handler(error, channelName));
  }

  private emitModerationEvent(event: ModerationEvent, connection: ChannelConnection): void {
    connection.moderationEventHandlers.forEach((handler) => handler(event));
    this.globalModerationEventHandlers.forEach((handler) => handler(event));
  }

  private emitChatAccess(
    access: ChatAccessState,
    channelName: string,
    connection: ChannelConnection
  ): void {
    connection.chatAccessHandlers.forEach((handler) => handler(access, channelName));
    this.globalChatAccessHandlers.forEach((handler) => handler(access, channelName));
  }

  isConnectedTo(channelName: string): boolean {
    const connection = this.connections.get(channelName);
    return connection ? connection.ws.readyState === WebSocket.OPEN : false;
  }

  get connectedChannels(): string[] {
    return Array.from(this.connections.keys());
  }

  get isConnected(): boolean {
    return (
      this.connections.size > 0 &&
      Array.from(this.connections.values()).some((c) => c.ws.readyState === WebSocket.OPEN)
    );
  }

  get currentChannel(): string | null {
    // Return first connected channel for backward compatibility
    const channels = Array.from(this.connections.keys());
    return channels.length > 0 ? channels[0] : null;
  }
}

export interface ChatClientOptions {
  /** Custom WebSocket base URL (default: wss://hackclub.tv/api/chat) */
  baseUrl?: string;
}
