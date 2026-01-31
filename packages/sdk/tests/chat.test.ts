// testing completely controlled by claude opus 4.5 because i'm lazy as heck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HctvSdk, ChatClient } from '../src/index.js';
import type { ChatMessage, SystemMessage } from '../src/types.js';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  onclose: (() => void) | null = null;

  sentMessages: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(error: any) {
    this.onerror?.(error);
  }
}

let mockWebSocketInstance: MockWebSocket | null = null;

vi.stubGlobal(
  'WebSocket',
  class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWebSocketInstance = this;
    }
  }
);

// Mock process to simulate browser environment (avoid Node.js ws import path)
vi.stubGlobal('process', { versions: {} });

describe('HctvSdk', () => {
  beforeEach(() => {
    mockWebSocketInstance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with bot token', () => {
      const sdk = new HctvSdk({ botToken: 'test-token' });
      expect(sdk).toBeDefined();
      expect(sdk.chat).toBeInstanceOf(ChatClient);
    });

    it('should pass chat options to ChatClient', () => {
      const sdk = new HctvSdk({
        botToken: 'test-token',
        chatOptions: { baseUrl: 'wss://custom.url' },
      });
      expect(sdk.chat).toBeInstanceOf(ChatClient);
    });
  });
});

describe('ChatClient', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockWebSocketInstance = null;
    client = new ChatClient('test-bot-token');
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with bot token', () => {
      expect(client).toBeDefined();
      expect(client.isConnected).toBe(false);
      expect(client.currentChannel).toBeNull();
    });

    it('should accept custom base URL', () => {
      const customClient = new ChatClient('token', { baseUrl: 'wss://custom.url' });
      expect(customClient).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect to a channel', async () => {
      const connectPromise = client.connect('testchannel');

      await connectPromise;

      expect(client.isConnected).toBe(true);
      expect(mockWebSocketInstance).not.toBeNull();
      expect(mockWebSocketInstance?.url).toContain('/ws/testchannel');
    });

    it('should throw error when already connected', async () => {
      await client.connect('testchannel');

      await expect(client.connect('anotherchannel')).rejects.toThrow(
        'already connected, please disconnect from it first'
      );
    });

    it('should emit connected system message', async () => {
      const systemHandler = vi.fn();
      client.onSystemMessage(systemHandler);

      await client.connect('testchannel');

      expect(systemHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
          channelName: 'testchannel',
        })
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect from channel', async () => {
      await client.connect('testchannel');
      expect(client.isConnected).toBe(true);

      client.disconnect();

      expect(client.isConnected).toBe(false);
      expect(client.currentChannel).toBeNull();
    });

    it('should emit disconnected system message', async () => {
      const systemHandler = vi.fn();
      client.onSystemMessage(systemHandler);

      await client.connect('testchannel');
      client.disconnect();

      expect(systemHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'disconnected',
        })
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message when connected', async () => {
      await client.connect('testchannel');

      client.sendMessage('Hello, world!');

      const messages = mockWebSocketInstance!.sentMessages;
      const lastMsg = JSON.parse(messages[messages.length - 1]);
      expect(lastMsg.type).toBe('message');
      expect(lastMsg.message).toBe('Hello, world!');
    });

    it('should throw error when not connected', () => {
      expect(() => client.sendMessage('test')).toThrow('Not connected to a channel');
    });
  });

  describe('onMessage', () => {
    it('should call handler when message received (server format)', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      // Server format: { user: {...}, message: string }
      mockWebSocketInstance?.simulateMessage({
        user: {
          id: 'user-123',
          username: 'testuser',
          pfpUrl: 'https://example.com/pfp.jpg',
        },
        message: 'Hello from server',
      });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hello from server',
          username: 'testuser',
          pfpUrl: 'https://example.com/pfp.jpg',
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const messageHandler = vi.fn();
      const unsubscribe = client.onMessage(messageHandler);

      await client.connect('testchannel');

      unsubscribe();

      mockWebSocketInstance?.simulateMessage({
        user: { id: '1', username: 'testuser', pfpUrl: '' },
        message: 'Should not receive',
      });

      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple message handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.onMessage(handler1);
      client.onMessage(handler2);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        user: { id: '1', username: 'testuser', pfpUrl: '' },
        message: 'test message',
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('onHistory', () => {
    it('should call history handler when history received', async () => {
      const historyHandler = vi.fn();
      client.onHistory(historyHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        type: 'history',
        messages: [
          {
            user: { id: 'u1', username: 'user1', pfpUrl: '' },
            message: 'First message',
            type: 'message',
          },
          {
            user: { id: 'u2', username: 'user2', pfpUrl: '' },
            message: 'Second message',
            type: 'message',
          },
        ],
      });

      expect(historyHandler).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ message: 'First message', username: 'user1' }),
          expect.objectContaining({ message: 'Second message', username: 'user2' }),
        ])
      );
    });

    it('should return unsubscribe function', async () => {
      const historyHandler = vi.fn();
      const unsubscribe = client.onHistory(historyHandler);

      await client.connect('testchannel');
      unsubscribe();

      mockWebSocketInstance?.simulateMessage({
        type: 'history',
        messages: [],
      });

      expect(historyHandler).not.toHaveBeenCalled();
    });
  });

  describe('onSystemMessage', () => {
    it('should call handler for system events', async () => {
      const systemHandler = vi.fn();
      client.onSystemMessage(systemHandler);

      await client.connect('testchannel');

      expect(systemHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const systemHandler = vi.fn();
      const unsubscribe = client.onSystemMessage(systemHandler);

      unsubscribe();

      await client.connect('testchannel');

      expect(systemHandler).not.toHaveBeenCalled();
    });
  });

  describe('message parsing', () => {
    it('should handle message with full user object', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        user: {
          id: 'user-123',
          username: 'johndoe',
          pfpUrl: 'https://example.com/pfp.jpg',
          displayName: 'John Doe',
          isBot: false,
        },
        message: 'Hello',
      });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'johndoe',
          displayName: 'John Doe',
          message: 'Hello',
          isBot: false,
        })
      );
    });

    it('should handle bot messages', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        user: {
          id: 'bot-123',
          username: 'mybot',
          pfpUrl: 'https://example.com/bot.jpg',
          displayName: 'My Bot',
          isBot: true,
        },
        message: 'Hello from bot!',
      });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'mybot',
          isBot: true,
        })
      );
    });
  });

  describe('ping/pong', () => {
    it('should handle pong response from server', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        type: 'pong',
      });

      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('emoji responses', () => {
    it('should handle emojiMsgResponse from server', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        type: 'emojiMsgResponse',
        emojis: {
          smile: 'https://example.com/emoji/smile.png',
        },
      });

      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should handle emojiSearchResponse from server', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      mockWebSocketInstance?.simulateMessage({
        type: 'emojiSearchResponse',
        results: ['smile', 'smirk'],
      });

      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('currentChannel', () => {
    it('should return null when not connected', () => {
      expect(client.currentChannel).toBeNull();
    });

    it('should return channel name when connected', async () => {
      await client.connect('mychannel');
      expect(client.currentChannel).toBe('mychannel');
    });

    it('should return null after disconnect', async () => {
      await client.connect('mychannel');
      client.disconnect();
      expect(client.currentChannel).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(client.isConnected).toBe(false);
    });

    it('should return true when connected', async () => {
      await client.connect('testchannel');
      expect(client.isConnected).toBe(true);
    });

    it('should return false after disconnect', async () => {
      await client.connect('testchannel');
      client.disconnect();
      expect(client.isConnected).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should emit error system message on WebSocket error', async () => {
      const systemHandler = vi.fn();
      client.onSystemMessage(systemHandler);

      const connectPromise = client.connect('testchannel');

      await new Promise((resolve) => setTimeout(resolve, 5));

      mockWebSocketInstance?.simulateError(new Error('Connection failed'));

      await expect(connectPromise).rejects.toBeDefined();

      expect(systemHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });
  });
});

describe('ChatMessage type', () => {
  it('should have correct structure', () => {
    const message: ChatMessage = {
      id: 'msg-123',
      channelName: 'testchannel',
      username: 'testuser',
      message: 'Hello, world!',
      timestamp: Date.now(),
      type: 'message',
      isBot: false,
    };

    expect(message.id).toBe('msg-123');
    expect(message.channelName).toBe('testchannel');
    expect(message.username).toBe('testuser');
    expect(message.message).toBe('Hello, world!');
    expect(typeof message.timestamp).toBe('number');
    expect(message.type).toBe('message');
    expect(message.isBot).toBe(false);
  });

  it('should support systemMsg type', () => {
    const message: ChatMessage = {
      id: 'sys-123',
      channelName: 'testchannel',
      username: 'system',
      message: 'User joined',
      timestamp: Date.now(),
      type: 'systemMsg',
      isBot: false,
    };

    expect(message.type).toBe('systemMsg');
  });
});

describe('SystemMessage type', () => {
  it('should support connected type', () => {
    const message: SystemMessage = {
      type: 'connected',
      channelName: 'testchannel',
      message: 'Connected to testchannel',
      timestamp: Date.now(),
    };

    expect(message.type).toBe('connected');
  });

  it('should support disconnected type', () => {
    const message: SystemMessage = {
      type: 'disconnected',
      channelName: 'testchannel',
      message: 'Disconnected from testchannel',
      timestamp: Date.now(),
    };

    expect(message.type).toBe('disconnected');
  });

  it('should support error type', () => {
    const message: SystemMessage = {
      type: 'error',
      channelName: 'testchannel',
      message: 'An error occurred',
      timestamp: Date.now(),
    };

    expect(message.type).toBe('error');
  });
});

describe('Edge cases', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockWebSocketInstance = null;
    client = new ChatClient('test-bot-token');
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  it('should handle empty message', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);

    await client.connect('testchannel');

    mockWebSocketInstance?.simulateMessage({
      user: { id: '1', username: 'testuser', pfpUrl: '' },
      message: '',
    });

    expect(messageHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '',
      })
    );
  });

  it('should handle message with special characters', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);

    await client.connect('testchannel');

    const specialMessage = '🎉 Hello <script>alert("xss")</script> & "quotes" \'apostrophe\'';
    mockWebSocketInstance?.simulateMessage({
      user: { id: '1', username: 'testuser', pfpUrl: '' },
      message: specialMessage,
    });

    expect(messageHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: specialMessage,
      })
    );
  });

  it('should handle very long messages', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);

    await client.connect('testchannel');

    const longMessage = 'a'.repeat(10000);
    mockWebSocketInstance?.simulateMessage({
      user: { id: '1', username: 'testuser', pfpUrl: '' },
      message: longMessage,
    });

    expect(messageHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: longMessage,
      })
    );
  });

  it('should handle rapid successive messages', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);

    await client.connect('testchannel');

    for (let i = 0; i < 100; i++) {
      mockWebSocketInstance?.simulateMessage({
        user: { id: '1', username: 'testuser', pfpUrl: '' },
        message: `Message ${i}`,
      });
    }

    expect(messageHandler).toHaveBeenCalledTimes(100);
  });

  it('should handle disconnect while message is being processed', async () => {
    await client.connect('testchannel');
    client.disconnect();
    expect(() => client.sendMessage('test')).toThrow('Not connected');
  });
});
