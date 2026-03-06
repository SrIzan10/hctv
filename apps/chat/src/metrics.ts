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

  const errors = new Counter({
    name: 'hctv_chat_errors_total',
    help: 'Errors observed in the chat service grouped by phase.',
    labelNames: ['phase'],
    registers: [register],
  });

  return {
    deliveredMessages,
    errors,
    incomingMessages,
    messageDuration,
    moderationActions,
    moderationBlocks,
    register,
    websocketConnectionAttempts,
    websocketConnections,
  };
}

const globalForMetrics = globalThis as typeof globalThis & {
  __hctvChatMetrics?: ReturnType<typeof createMetricsStore>;
};

const metrics = (globalForMetrics.__hctvChatMetrics ??= createMetricsStore());

export const chatMetricsRegistry = metrics.register;

export function recordChatConnectionAccepted(authMethod: string): void {
  metrics.websocketConnectionAttempts.inc({ auth_method: authMethod, outcome: 'accepted' });
  metrics.websocketConnections.inc();
}

export function recordChatConnectionRejected(authMethod: string): void {
  metrics.websocketConnectionAttempts.inc({ auth_method: authMethod, outcome: 'rejected' });
}

export function recordChatDisconnect(): void {
  metrics.websocketConnections.dec();
}

export function recordIncomingChatMessage(type: string): void {
  metrics.incomingMessages.inc({ type });
}

export function startChatMessageTimer(type: string) {
  return metrics.messageDuration.startTimer({ type });
}

export function recordDeliveredChatMessage(senderType: string): void {
  metrics.deliveredMessages.inc({ sender_type: senderType });
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
