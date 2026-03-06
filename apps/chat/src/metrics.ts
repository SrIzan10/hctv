import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

function createMetricsStore() {
  const register = new Registry();
  register.setDefaultLabels({ app: 'chat' });

  collectDefaultMetrics({
    prefix: 'hctv_chat_',
    register,
  });

  const websocketConnections = new Gauge({
    name: 'hctv_chat_websocket_connections',
    help: 'Current number of active chat websocket connections.',
    registers: [register],
  });

  const websocketConnectionsByChannel = new Gauge({
    name: 'hctv_chat_websocket_connections_by_channel',
    help: 'Current number of active chat websocket connections by target channel.',
    labelNames: ['channel'],
    registers: [register],
  });

  const websocketConnectionsByAuthMethod = new Gauge({
    name: 'hctv_chat_websocket_connections_by_auth_method',
    help: 'Current number of active chat websocket connections by auth method.',
    labelNames: ['auth_method'],
    registers: [register],
  });

  const websocketConnectionAttempts = new Counter({
    name: 'hctv_chat_websocket_connection_attempts_total',
    help: 'Total websocket connection attempts grouped by outcome and auth method.',
    labelNames: ['outcome', 'auth_method'],
    registers: [register],
  });

  const incomingMessages = new Counter({
    name: 'hctv_chat_incoming_messages_total',
    help: 'Total inbound websocket frames grouped by message type.',
    labelNames: ['type'],
    registers: [register],
  });

  const inboundPayloadBytes = new Counter({
    name: 'hctv_chat_inbound_payload_bytes_total',
    help: 'Total inbound websocket payload bytes grouped by message type.',
    labelNames: ['type'],
    registers: [register],
  });

  const messageDuration = new Histogram({
    name: 'hctv_chat_message_duration_seconds',
    help: 'Chat websocket message processing time in seconds.',
    labelNames: ['type', 'outcome'],
    buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register],
  });

  const deliveredMessages = new Counter({
    name: 'hctv_chat_messages_delivered_total',
    help: 'Total chat messages successfully broadcast, grouped by sender type.',
    labelNames: ['sender_type'],
    registers: [register],
  });

  const deliveredMessageBytes = new Counter({
    name: 'hctv_chat_message_bytes_delivered_total',
    help: 'Total message body bytes successfully broadcast, grouped by sender type.',
    labelNames: ['sender_type'],
    registers: [register],
  });

  const channelHistorySize = new Gauge({
    name: 'hctv_chat_channel_history_size',
    help: 'Current number of messages retained in Redis history for a channel.',
    labelNames: ['channel'],
    registers: [register],
  });

  const channelHistoryLoadedMessages = new Counter({
    name: 'hctv_chat_history_messages_loaded_total',
    help: 'Total history messages loaded from Redis during websocket joins.',
    labelNames: ['channel'],
    registers: [register],
  });

  const moderationState = new Gauge({
    name: 'hctv_chat_moderation_state',
    help: 'Current moderation settings by channel.',
    labelNames: ['channel', 'setting'],
    registers: [register],
  });

  const channelUniqueChatters = new Counter({
    name: 'hctv_chat_unique_chatters_total',
    help: 'Users who successfully sent at least one chat message, grouped by sender type.',
    labelNames: ['sender_type'],
    registers: [register],
  });

  const moderationActions = new Counter({
    name: 'hctv_chat_moderation_actions_total',
    help: 'Successful moderation actions performed in chat.',
    labelNames: ['action'],
    registers: [register],
  });

  const moderationBlocks = new Counter({
    name: 'hctv_chat_moderation_blocks_total',
    help: 'Message blocks and throttling decisions grouped by reason.',
    labelNames: ['reason'],
    registers: [register],
  });

  const emojiSearchResults = new Histogram({
    name: 'hctv_chat_emoji_search_results',
    help: 'Number of emoji search results returned per query.',
    labelNames: ['outcome'],
    buckets: [0, 1, 2, 5, 10, 25, 50, 100, 150],
    registers: [register],
  });

  const errors = new Counter({
    name: 'hctv_chat_errors_total',
    help: 'Errors observed in the chat service grouped by phase.',
    labelNames: ['phase'],
    registers: [register],
  });

  return {
    deliveredMessages,
    deliveredMessageBytes,
    channelHistoryLoadedMessages,
    channelHistorySize,
    emojiSearchResults,
    errors,
    inboundPayloadBytes,
    incomingMessages,
    messageDuration,
    moderationActions,
    moderationBlocks,
    moderationState,
    register,
    channelUniqueChatters,
    websocketConnectionAttempts,
    websocketConnections,
    websocketConnectionsByAuthMethod,
    websocketConnectionsByChannel,
  };
}

const globalForMetrics = globalThis as typeof globalThis & {
  __hctvChatMetrics?: ReturnType<typeof createMetricsStore>;
};

const metrics = (globalForMetrics.__hctvChatMetrics ??= createMetricsStore());

export const chatMetricsRegistry = metrics.register;

export function recordChatConnectionAccepted(channel: string, authMethod: string): void {
  metrics.websocketConnectionAttempts.inc({ auth_method: authMethod, outcome: 'accepted' });
  metrics.websocketConnections.inc();
  metrics.websocketConnectionsByChannel.inc({ channel });
  metrics.websocketConnectionsByAuthMethod.inc({ auth_method: authMethod });
}

export function recordChatConnectionRejected(authMethod: string): void {
  metrics.websocketConnectionAttempts.inc({ auth_method: authMethod, outcome: 'rejected' });
}

export function recordChatDisconnect(channel: string, authMethod: string): void {
  metrics.websocketConnections.dec();
  metrics.websocketConnectionsByChannel.dec({ channel });
  metrics.websocketConnectionsByAuthMethod.dec({ auth_method: authMethod });
}

export function recordIncomingChatMessage(type: string, payloadBytes: number): void {
  metrics.incomingMessages.inc({ type });
  metrics.inboundPayloadBytes.inc({ type }, payloadBytes);
}

export function startChatMessageTimer(type: string) {
  return metrics.messageDuration.startTimer({ type });
}

export function recordDeliveredChatMessage(senderType: string): void {
  metrics.deliveredMessages.inc({ sender_type: senderType });
}

export function recordDeliveredChatMessageBytes(senderType: string, bytes: number): void {
  metrics.deliveredMessageBytes.inc({ sender_type: senderType }, bytes);
}

export function setChannelHistorySize(channel: string, size: number): void {
  metrics.channelHistorySize.set({ channel }, size);
}

export function recordHistoryMessagesLoaded(channel: string, count: number): void {
  if (count > 0) {
    metrics.channelHistoryLoadedMessages.inc({ channel }, count);
  }
}

export function setChatModerationState(
  channel: string,
  settings: {
    blockedTerms: number;
    maxMessageLength: number;
    rateLimitCount: number;
    rateLimitWindowSeconds: number;
    slowModeSeconds: number;
  }
): void {
  metrics.moderationState.set({ channel, setting: 'blocked_terms' }, settings.blockedTerms);
  metrics.moderationState.set({ channel, setting: 'slow_mode_seconds' }, settings.slowModeSeconds);
  metrics.moderationState.set(
    { channel, setting: 'max_message_length' },
    settings.maxMessageLength
  );
  metrics.moderationState.set({ channel, setting: 'rate_limit_count' }, settings.rateLimitCount);
  metrics.moderationState.set(
    { channel, setting: 'rate_limit_window_seconds' },
    settings.rateLimitWindowSeconds
  );
}

export function recordUniqueChatter(senderType: string): void {
  metrics.channelUniqueChatters.inc({ sender_type: senderType });
}

export function recordChatModerationAction(action: string): void {
  metrics.moderationActions.inc({ action });
}

export function recordChatModerationBlock(reason: string): void {
  metrics.moderationBlocks.inc({ reason });
}

export function recordChatError(phase: string): void {
  metrics.errors.inc({ phase });
}

export function recordEmojiSearchResults(outcome: string, count: number): void {
  metrics.emojiSearchResults.observe({ outcome }, count);
}
