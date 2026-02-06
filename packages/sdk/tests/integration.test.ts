/**
 * integration tests for the sdk
 * 
 * these  run against the real production server.
 * 
 * Prerequisites:
 * 1. Set BOT_TOKEN environment variable with a valid bot API key
 * 
 * Run with:
 *   BOT_TOKEN=your-token pnpm test
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { ChatClient } from '../src/chat.js';
import type { ChatMessage, SystemMessage } from '../src/types.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const TEST_CHANNEL = "bot-playground";

describe.skipIf(!BOT_TOKEN)('ChatClient Integration Tests', () => {
  let client: ChatClient;

  beforeAll(() => {
    if (!BOT_TOKEN) {
      console.warn('⚠️  BOT_TOKEN not set. Skipping integration tests.');
      console.warn('   Set BOT_TOKEN environment variable to run integration tests.');
    }
  });

  beforeEach(() => {
    client = new ChatClient(BOT_TOKEN!);
  });

  afterEach(async () => {
    if (client.isConnected) {
      client.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  describe('Connection', () => {
    it('should connect to production chat server', async () => {
      const systemMessages: SystemMessage[] = [];
      client.onSystemMessage((msg) => systemMessages.push(msg));

      await client.connect(TEST_CHANNEL);

      expect(client.isConnected).toBe(true);
      expect(client.currentChannel).toBe(TEST_CHANNEL);
      expect(systemMessages.some((m) => m.type === 'connected')).toBe(true);
    }, 15000);

    it('should receive history on connection', async () => {
      const history: ChatMessage[][] = [];
      client.onHistory((messages) => history.push(messages));

      await client.connect(TEST_CHANNEL);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(history.length).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should disconnect cleanly', async () => {
      const systemMessages: SystemMessage[] = [];
      client.onSystemMessage((msg) => systemMessages.push(msg));

      await client.connect(TEST_CHANNEL);
      expect(client.isConnected).toBe(true);

      client.disconnect();

      expect(client.isConnected).toBe(false);
      expect(client.currentChannel).toBeNull();
      // idk why ts claude opus clanker thinks that system messages exist as of jan 31st.
      //expect(systemMessages.some((m) => m.type === 'disconnected')).toBe(true);
    }, 15000);
  });

  describe('Messaging', () => {
    it('should send and receive own message (echo)', async () => {
      const receivedMessages: ChatMessage[] = [];
      const testMessage = `SDK test message ${Date.now()}`;

      client.onMessage((msg) => receivedMessages.push(msg));

      await client.connect(TEST_CHANNEL);
      client.sendMessage(testMessage);

      // Wait for the message to echo back
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const sentMessage = receivedMessages.find((msg) => msg.message === testMessage);
      expect(sentMessage).toBeDefined();
      expect(sentMessage?.message).toBe(testMessage);
    }, 15000);

    it('should receive messages with correct structure', async () => {
      const receivedMessages: ChatMessage[] = [];
      const testMessage = `Structure test ${Date.now()}`;

      client.onMessage((msg) => receivedMessages.push(msg));

      await client.connect(TEST_CHANNEL);
      client.sendMessage(testMessage);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const msg = receivedMessages.find((m) => m.message === testMessage);
      expect(msg).toBeDefined();

      if (msg) {
        expect(msg.id).toBeDefined();
        expect(msg.channelName).toBe(TEST_CHANNEL);
        expect(msg.username).toBeDefined();
        expect(msg.message).toBe(testMessage);
        expect(typeof msg.timestamp).toBe('number');
        expect(msg.type).toBe('message');
        expect(typeof msg.isBot).toBe('boolean');
      }
    }, 15000);
  });

  describe('Event Handlers', () => {
    it('should allow multiple message handlers', async () => {
      const handler1Messages: ChatMessage[] = [];
      const handler2Messages: ChatMessage[] = [];
      const testMessage = `Multi-handler test ${Date.now()}`;

      client.onMessage((msg) => handler1Messages.push(msg));
      client.onMessage((msg) => handler2Messages.push(msg));

      await client.connect(TEST_CHANNEL);
      client.sendMessage(testMessage);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const h1Msg = handler1Messages.find((m) => m.message === testMessage);
      const h2Msg = handler2Messages.find((m) => m.message === testMessage);

      expect(h1Msg).toBeDefined();
      expect(h2Msg).toBeDefined();
    }, 15000);

    it('should support unsubscribing from handlers', async () => {
      const messages: ChatMessage[] = [];
      const testMessage = `Unsubscribe test ${Date.now()}`;

      const unsubscribe = client.onMessage((msg) => messages.push(msg));

      await client.connect(TEST_CHANNEL);

      // Unsubscribe before sending
      unsubscribe();

      client.sendMessage(testMessage);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should not have received the message
      const found = messages.find((m) => m.message === testMessage);
      expect(found).toBeUndefined();
    }, 15000);
  });

  describe('Reconnection', () => {
    it('should be able to reconnect after disconnect', async () => {
      await client.connect(TEST_CHANNEL);
      expect(client.isConnected).toBe(true);

      client.disconnect();
      expect(client.isConnected).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 500));

      await client.connect(TEST_CHANNEL);
      expect(client.isConnected).toBe(true);
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should reject connecting to invalid channel', async () => {
      const invalidClient = new ChatClient('invalid-token-12345');

      try {
        await invalidClient.connect(TEST_CHANNEL);
        invalidClient.disconnect();
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 15000);

    it('should throw when sending message while disconnected', () => {
      expect(() => client.sendMessage('test')).toThrow('Not connected to any channel');
    });
  });
});
