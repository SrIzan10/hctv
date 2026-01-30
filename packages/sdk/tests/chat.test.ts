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

vi.stubGlobal('WebSocket', class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockWebSocketInstance = this;
  }
});

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
  });

  describe('connect', () => {
    it('should connect to a channel', async () => {
      const connectPromise = client.connect('testchannel');
      
      await connectPromise;
      
      expect(client.isConnected).toBe(true);
      expect(mockWebSocketInstance).not.toBeNull();
      expect(mockWebSocketInstance?.url).toContain('/ws');
    });

    it('should send auth message on connect', async () => {
      await client.connect('testchannel');
      
      expect(mockWebSocketInstance?.sentMessages.length).toBeGreaterThan(0);
      const authMsg = JSON.parse(mockWebSocketInstance!.sentMessages[0]);
      expect(authMsg.type).toBe('auth');
      expect(authMsg.token).toBe('test-bot-token');
      expect(authMsg.channelName).toBe('testchannel');
    });

    it('should throw error when already connected', async () => {
      await client.connect('testchannel');
      
      await expect(client.connect('anotherchannel')).rejects.toThrow(
        'Already connected to a channel'
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
    it('should call handler when message received', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        message: 'Hello from server',
        user: {
          id: 'user-123',
          username: 'testuser',
          pfpUrl: 'https://example.com/pfp.jpg',
        },
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Hello from server',
          username: 'testuser',
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const messageHandler = vi.fn();
      const unsubscribe = client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      unsubscribe();
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        message: 'Should not receive',
        user: { username: 'testuser' },
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
        type: 'message',
        message: 'test message',
        user: { username: 'testuser' },
      });
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
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
        type: 'message',
        message: 'Hello',
        user: {
          id: 'user-123',
          username: 'johndoe',
          pfpUrl: 'https://example.com/pfp.jpg',
          displayName: 'John Doe',
          isBot: false,
        },
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'johndoe',
          message: 'Hello',
        })
      );
    });

    it('should handle message with username directly', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        message: 'Direct username',
        username: 'directuser',
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'directuser',
          message: 'Direct username',
        })
      );
    });

    it('should ignore invalid messages', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
      });
      
      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should ignore non-message types', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'pong',
      });
      
      mockWebSocketInstance?.simulateMessage({
        type: 'history',
        messages: [],
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
      
      await new Promise(resolve => setTimeout(resolve, 5));
      
      mockWebSocketInstance?.simulateError(new Error('Connection failed'));
      
      await expect(connectPromise).rejects.toBeDefined();
      
      expect(systemHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should handle malformed message data gracefully', async () => {
      const messageHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      client.onMessage(messageHandler);
      await client.connect('testchannel');
      
      mockWebSocketInstance?.onmessage?.({ data: 'not valid json{' });
      
      expect(messageHandler).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
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
    };

    expect(message.id).toBe('msg-123');
    expect(message.channelName).toBe('testchannel');
    expect(message.username).toBe('testuser');
    expect(message.message).toBe('Hello, world!');
    expect(typeof message.timestamp).toBe('number');
    expect(message.type).toBe('message');
  });

  it('should support systemMsg type', () => {
    const message: ChatMessage = {
      id: 'sys-123',
      channelName: 'testchannel',
      username: 'system',
      message: 'User joined',
      timestamp: Date.now(),
      type: 'systemMsg',
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

describe('Integration with Chat Server Protocol', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockWebSocketInstance = null;
    client = new ChatClient('test-bot-token');
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  describe('history messages', () => {
    it('should handle history message from server', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
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
      
      expect(messageHandler).not.toHaveBeenCalled();
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
          laugh: 'https://example.com/emoji/laugh.png',
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
        results: ['smile', 'smirk', 'smiley'],
      });
      
      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('bot user messages', () => {
    it('should handle messages from bot users', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        message: 'Hello from bot!',
        user: {
          id: 'bot-123',
          username: 'mybot',
          pfpUrl: 'https://example.com/bot-avatar.png',
          displayName: 'My Bot',
          isBot: true,
        },
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'mybot',
          message: 'Hello from bot!',
        })
      );
    });
  });

  describe('message structure from server', () => {
    it('should handle message structure matching chat server format', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        user: {
          id: 'user-abc',
          username: 'streamuser',
          pfpUrl: 'https://example.com/pfp.jpg',
          displayName: 'Stream User',
          isBot: false,
        },
        message: 'Great stream!',
      });
      
      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should handle message with explicit type', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);
      
      await client.connect('testchannel');
      
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        user: {
          id: 'user-abc',
          username: 'streamuser',
          pfpUrl: 'https://example.com/pfp.jpg',
        },
        message: 'Great stream!',
      });
      
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'streamuser',
          message: 'Great stream!',
        })
      );
    });
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
      type: 'message',
      message: '',
      user: { username: 'testuser' },
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
      type: 'message',
      message: specialMessage,
      user: { username: 'testuser' },
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
      type: 'message',
      message: longMessage,
      user: { username: 'testuser' },
    });
    
    expect(messageHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        message: longMessage,
      })
    );
  });

  it('should handle unicode usernames', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);
    
    await client.connect('testchannel');
    
    mockWebSocketInstance?.simulateMessage({
      type: 'message',
      message: 'Hello',
      user: { username: '日本語ユーザー' },
    });
    
    expect(messageHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        username: '日本語ユーザー',
      })
    );
  });

  it('should handle rapid successive messages', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);
    
    await client.connect('testchannel');
    
    for (let i = 0; i < 100; i++) {
      mockWebSocketInstance?.simulateMessage({
        type: 'message',
        message: `Message ${i}`,
        user: { username: 'testuser' },
      });
    }
    
    expect(messageHandler).toHaveBeenCalledTimes(100);
  });

  it('should handle errors in message handlers gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const goodHandler = vi.fn();
    
    client.onMessage(errorHandler);
    client.onMessage(goodHandler);
    
    await client.connect('testchannel');
    
    mockWebSocketInstance?.simulateMessage({
      type: 'message',
      message: 'Test',
      user: { username: 'testuser' },
    });
    
    expect(goodHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should handle disconnect while message is being processed', async () => {
    const messageHandler = vi.fn();
    client.onMessage(messageHandler);
    
    await client.connect('testchannel');
    
    client.disconnect();
    
    expect(() => client.sendMessage('test')).toThrow('Not connected');
  });
});