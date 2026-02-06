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

let mockWebSocketInstances: MockWebSocket[] = [];

vi.stubGlobal(
  'WebSocket',
  class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWebSocketInstances.push(this);
    }
  }
);

// Helper to get mock instance by channel name
function getMockInstance(channelName: string): MockWebSocket | undefined {
  return mockWebSocketInstances.find((ws) => ws.url.includes(`/${channelName}`));
}

// Mock process to simulate browser environment (avoid Node.js ws import path)
vi.stubGlobal('process', { versions: {} });

describe('HctvSdk', () => {
  beforeEach(() => {
    mockWebSocketInstances = [];
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
    mockWebSocketInstances = [];
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
      const mockWs = getMockInstance('testchannel');
      expect(mockWs).not.toBeUndefined();
      expect(mockWs?.url).toContain('/ws/testchannel');
    });

    it('should allow connecting to multiple channels', async () => {
      await client.connect('channel1');
      await client.connect('channel2');

      expect(client.isConnectedTo('channel1')).toBe(true);
      expect(client.isConnectedTo('channel2')).toBe(true);
      expect(client.connectedChannels).toEqual(['channel1', 'channel2']);
    });

    it('should throw error when already connected to same channel', async () => {
      await client.connect('testchannel');

      await expect(client.connect('testchannel')).rejects.toThrow(
        'already connected to channel: testchannel'
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
    it('should disconnect from specific channel', async () => {
      await client.connect('channel1');
      await client.connect('channel2');

      expect(client.isConnectedTo('channel1')).toBe(true);
      expect(client.isConnectedTo('channel2')).toBe(true);

      client.disconnect('channel1');

      expect(client.isConnectedTo('channel1')).toBe(false);
      expect(client.isConnectedTo('channel2')).toBe(true);
    });

    it('should disconnect from all channels when no channel specified', async () => {
      await client.connect('channel1');
      await client.connect('channel2');
      expect(client.isConnected).toBe(true);

      client.disconnect();

      expect(client.isConnected).toBe(false);
      expect(client.connectedChannels.length).toBe(0);
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
    it('should send a message to specific channel', async () => {
      await client.connect('testchannel');

      client.sendMessage('Hello, world!', 'testchannel');

      const mockWs = getMockInstance('testchannel');
      const messages = mockWs!.sentMessages;
      const lastMsg = JSON.parse(messages[messages.length - 1]);
      expect(lastMsg.type).toBe('message');
      expect(lastMsg.message).toBe('Hello, world!');
    });

    it('should send to first channel when no channel specified', async () => {
      await client.connect('testchannel');

      client.sendMessage('Hello, world!');

      const mockWs = getMockInstance('testchannel');
      const messages = mockWs!.sentMessages;
      const lastMsg = JSON.parse(messages[messages.length - 1]);
      expect(lastMsg.type).toBe('message');
      expect(lastMsg.message).toBe('Hello, world!');
    });

    it('should throw error when not connected', () => {
      expect(() => client.sendMessage('test')).toThrow('Not connected to any channel');
    });

    it('should throw error when channel not connected', async () => {
      await client.connect('channel1');
      expect(() => client.sendMessage('test', 'channel2')).toThrow(
        'Not connected to channel: channel2'
      );
    });
  });

  describe('onMessage', () => {
    it('should call global handler when message received', async () => {
      const messageHandler = vi.fn();
      client.onMessage(messageHandler);

      await client.connect('testchannel');

      const mockWs = getMockInstance('testchannel');
      // Server format: { user: {...}, message: string }
      mockWs?.simulateMessage({
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

    it('should call channel-specific handler', async () => {
      await client.connect('testchannel');

      const channelHandler = vi.fn();
      client.onMessage(channelHandler, 'testchannel');

      const mockWs = getMockInstance('testchannel');
      mockWs?.simulateMessage({
        user: { id: '1', username: 'testuser', pfpUrl: '' },
        message: 'Hello',
      });

      expect(channelHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hello' }));
    });

    it('should route messages to correct channel handler', async () => {
      await client.connect('channel1');
      await client.connect('channel2');

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      client.onMessage(handler1, 'channel1');
      client.onMessage(handler2, 'channel2');

      const mockWs1 = getMockInstance('channel1');
      const mockWs2 = getMockInstance('channel2');

      mockWs1?.simulateMessage({
        user: { id: '1', username: 'user1', pfpUrl: '' },
        message: 'Message to channel1',
      });

      mockWs2?.simulateMessage({
        user: { id: '2', username: 'user2', pfpUrl: '' },
        message: 'Message to channel2',
      });

      expect(handler1).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Message to channel1', channelName: 'channel1' })
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Message to channel2', channelName: 'channel2' })
      );
    });

    it('should call global handler for all channels', async () => {
      const globalHandler = vi.fn();
      client.onMessage(globalHandler);

      await client.connect('channel1');
      await client.connect('channel2');

      const mockWs1 = getMockInstance('channel1');
      const mockWs2 = getMockInstance('channel2');

      mockWs1?.simulateMessage({
        user: { id: '1', username: 'user1', pfpUrl: '' },
        message: 'Message 1',
      });

      mockWs2?.simulateMessage({
        user: { id: '2', username: 'user2', pfpUrl: '' },
        message: 'Message 2',
      });

      expect(globalHandler).toHaveBeenCalledTimes(2);
      expect(globalHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Message 1', channelName: 'channel1' })
      );
      expect(globalHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Message 2', channelName: 'channel2' })
      );
    });

    it('should return unsubscribe function', async () => {
      const messageHandler = vi.fn();
      const unsubscribe = client.onMessage(messageHandler);

      await client.connect('testchannel');

      unsubscribe();

      const mockWs = getMockInstance('testchannel');
      mockWs?.simulateMessage({
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

      const mockWs = getMockInstance('testchannel');
      mockWs?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateMessage({
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

      getMockInstance('testchannel')?.simulateError(new Error('Connection failed'));

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

describe('Multi-channel support', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockWebSocketInstances = [];
    client = new ChatClient('test-bot-token');
  });

  afterEach(() => {
    client.disconnect();
    vi.clearAllMocks();
  });

  it('should connect to multiple channels simultaneously', async () => {
    await client.connect('channel1');
    await client.connect('channel2');
    await client.connect('channel3');

    expect(client.connectedChannels).toEqual(['channel1', 'channel2', 'channel3']);
    expect(client.isConnectedTo('channel1')).toBe(true);
    expect(client.isConnectedTo('channel2')).toBe(true);
    expect(client.isConnectedTo('channel3')).toBe(true);
  });

  it('should send messages to specific channels', async () => {
    await client.connect('channel1');
    await client.connect('channel2');

    client.sendMessage('Message 1', 'channel1');
    client.sendMessage('Message 2', 'channel2');

    const mockWs1 = getMockInstance('channel1');
    const mockWs2 = getMockInstance('channel2');

    const msg1 = JSON.parse(mockWs1!.sentMessages[mockWs1!.sentMessages.length - 1]);
    const msg2 = JSON.parse(mockWs2!.sentMessages[mockWs2!.sentMessages.length - 1]);

    expect(msg1.message).toBe('Message 1');
    expect(msg2.message).toBe('Message 2');
  });

  it('should route messages correctly with channel-specific handlers', async () => {
    await client.connect('channel1');
    await client.connect('channel2');

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    client.onMessage(handler1, 'channel1');
    client.onMessage(handler2, 'channel2');

    const mockWs1 = getMockInstance('channel1');
    const mockWs2 = getMockInstance('channel2');

    mockWs1?.simulateMessage({
      user: { id: '1', username: 'user1', pfpUrl: '' },
      message: 'Hello channel 1',
    });

    mockWs2?.simulateMessage({
      user: { id: '2', username: 'user2', pfpUrl: '' },
      message: 'Hello channel 2',
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello channel 1',
        channelName: 'channel1',
      })
    );

    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello channel 2',
        channelName: 'channel2',
      })
    );
  });

  it('should support global handlers receiving from all channels', async () => {
    const globalHandler = vi.fn();
    client.onMessage(globalHandler);

    await client.connect('channel1');
    await client.connect('channel2');

    const mockWs1 = getMockInstance('channel1');
    const mockWs2 = getMockInstance('channel2');

    mockWs1?.simulateMessage({
      user: { id: '1', username: 'user1', pfpUrl: '' },
      message: 'Message from channel 1',
    });

    mockWs2?.simulateMessage({
      user: { id: '2', username: 'user2', pfpUrl: '' },
      message: 'Message from channel 2',
    });

    expect(globalHandler).toHaveBeenCalledTimes(2);
  });

  it('should disconnect from specific channel without affecting others', async () => {
    await client.connect('channel1');
    await client.connect('channel2');
    await client.connect('channel3');

    client.disconnect('channel2');

    expect(client.isConnectedTo('channel1')).toBe(true);
    expect(client.isConnectedTo('channel2')).toBe(false);
    expect(client.isConnectedTo('channel3')).toBe(true);
    expect(client.connectedChannels).toEqual(['channel1', 'channel3']);
  });

  it('should handle history for multiple channels independently', async () => {
    const historyHandler = vi.fn();
    client.onHistory(historyHandler);

    await client.connect('channel1');
    await client.connect('channel2');

    const mockWs1 = getMockInstance('channel1');
    const mockWs2 = getMockInstance('channel2');

    mockWs1?.simulateMessage({
      type: 'history',
      messages: [{ user: { id: '1', username: 'u1', pfpUrl: '' }, message: 'C1 History' }],
    });

    mockWs2?.simulateMessage({
      type: 'history',
      messages: [{ user: { id: '2', username: 'u2', pfpUrl: '' }, message: 'C2 History' }],
    });

    expect(historyHandler).toHaveBeenCalledTimes(2);
  });

  it('should maintain backward compatibility with single channel usage', async () => {
    await client.connect('testchannel');

    expect(client.isConnected).toBe(true);
    expect(client.currentChannel).toBe('testchannel');

    client.sendMessage('Test');

    const mockWs = getMockInstance('testchannel');
    expect(mockWs!.sentMessages.length).toBeGreaterThan(0);
  });
});

describe('Edge cases', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockWebSocketInstances = [];
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

    getMockInstance('testchannel')?.simulateMessage({
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
    getMockInstance('testchannel')?.simulateMessage({
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
    getMockInstance('testchannel')?.simulateMessage({
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
      getMockInstance('testchannel')?.simulateMessage({
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
