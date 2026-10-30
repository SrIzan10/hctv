import { ChatModerationAction, getRedisConnection, prisma } from '@hctv/db';
import type {
  ChatModerationSettingsShape,
  ChatRestrictionState,
  ChatSocket,
} from './types';

const redis = getRedisConnection();
export const MESSAGE_HISTORY_SIZE = 100;
export const MESSAGE_TTL = 60 * 60 * 24;
const MODERATION_SETTINGS_CACHE_TTL_SECONDS = 30;

export type IncomingMessage = {
  type?: string;
  [key: string]: unknown;
};

const METRICS_MESSAGE_TYPES = [
  'ping',
  'message',
  'emojiMsg',
  'emojiSearch',
  'mod:deleteMessage',
  'mod:timeoutUser',
  'mod:banUser',
  'mod:unbanUser',
  'mod:liftTimeout',
] as const;

type MetricsMessageType = (typeof METRICS_MESSAGE_TYPES)[number] | 'unknown';

export function getMetricsMessageType(type: unknown): MetricsMessageType {
  if (typeof type !== 'string') {
    return 'unknown';
  }

  return (METRICS_MESSAGE_TYPES as readonly string[]).includes(type)
    ? (type as MetricsMessageType)
    : 'unknown';
}

const DEFAULT_MODERATION_SETTINGS: ChatModerationSettingsShape = {
  blockedTerms: [],
  slowModeSeconds: 0,
  maxMessageLength: 400,
  rateLimitCount: 8,
  rateLimitWindowSeconds: 10,
};

export function normalizeModerationSettings(
  settings?: Partial<ChatModerationSettingsShape> | null
): ChatModerationSettingsShape {
  return {
    blockedTerms:
      settings?.blockedTerms
        ?.map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 2)
        .slice(0, 200) ?? [],
    slowModeSeconds: Math.min(Math.max(settings?.slowModeSeconds ?? 0, 0), 120),
    maxMessageLength: Math.min(Math.max(settings?.maxMessageLength ?? 50, 50), 2000),
    rateLimitCount: Math.min(Math.max(settings?.rateLimitCount ?? 8, 3), 30),
    rateLimitWindowSeconds: Math.min(Math.max(settings?.rateLimitWindowSeconds ?? 10, 5), 60),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsBlockedTerm(message: string, blockedTerms: string[]): string | null {
  const normalizedMessage = message.toLowerCase();

  for (const term of blockedTerms) {
    const regex = new RegExp(`(^|\\W)${escapeRegExp(term)}($|\\W)`, 'i');
    if (regex.test(normalizedMessage)) {
      return term;
    }
  }

  return null;
}

export async function getCachedModerationSettings(
  channelId: string
): Promise<ChatModerationSettingsShape> {
  const cacheKey = `chat:moderation:settings:${channelId}`;
  const cachedSettings = await redis.get(cacheKey);

  if (cachedSettings) {
    try {
      return normalizeModerationSettings(JSON.parse(cachedSettings));
    } catch {
      await redis.del(cacheKey);
    }
  }

  const dbSettings = await prisma.chatModerationSettings.findUnique({
    where: { channelId },
    select: {
      blockedTerms: true,
      slowModeSeconds: true,
      maxMessageLength: true,
      rateLimitCount: true,
      rateLimitWindowSeconds: true,
    },
  });

  const normalized = normalizeModerationSettings(dbSettings ?? DEFAULT_MODERATION_SETTINGS);
  await redis.setex(cacheKey, MODERATION_SETTINGS_CACHE_TTL_SECONDS, JSON.stringify(normalized));
  return normalized;
}

// every open chat connection, grouped by the channel it is attached to
const channelSockets = new Map<string, Set<ChatSocket>>();

export function registerSocket(socket: ChatSocket) {
  const channel = socket.targetUsername!;
  let set = channelSockets.get(channel);
  if (!set) {
    set = new Set();
    channelSockets.set(channel, set);
  }
  set.add(socket);
}

export function unregisterSocket(socket: ChatSocket) {
  const channel = socket.targetUsername;
  if (!channel) return;
  const set = channelSockets.get(channel);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) channelSockets.delete(channel);
}

// the sender is included in the fan-out, same as the standalone chat server
export function broadcastToChannel(
  targetUsername: string,
  _ws: ChatSocket,
  payload: Record<string, unknown>
) {
  const data = JSON.stringify(payload);
  channelSockets.get(targetUsername)?.forEach((client) => {
    if (client.isOpen()) client.send(data);
  });
}

export async function getActiveRestriction(
  channelId: string,
  userId: string
): Promise<ChatRestrictionState | null> {
  const activeBan = await prisma.chatUserBan.findUnique({
    where: {
      channelId_userId: {
        channelId,
        userId,
      },
    },
    select: {
      reason: true,
      expiresAt: true,
    },
  });

  if (!activeBan) {
    return null;
  }

  if (activeBan.expiresAt && activeBan.expiresAt < new Date()) {
    await prisma.chatUserBan.delete({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });
    return null;
  }

  return {
    type: activeBan.expiresAt ? 'timeout' : 'ban',
    reason: activeBan.reason,
    expiresAt: activeBan.expiresAt,
  };
}

export async function sendChatAccessState(socket: ChatSocket, channelId: string, userId: string) {
  const restriction = await getActiveRestriction(channelId, userId);
  socket.send(
    JSON.stringify({
      type: 'chatAccess',
      canSend: !restriction,
      restriction,
    })
  );
}

export async function broadcastRestrictionStateToUser(
  targetUsername: string,
  targetUserId: string,
  channelId: string,
  _ws: ChatSocket
) {
  const restriction = await getActiveRestriction(channelId, targetUserId);
  const data = JSON.stringify({
    type: 'chatAccess',
    canSend: !restriction,
    restriction,
  });
  channelSockets.get(targetUsername)?.forEach((client) => {
    if (client.isOpen() && client.chatUser?.id === targetUserId) client.send(data);
  });
}

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export async function isRateLimited(
  channelId: string,
  userId: string,
  count: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `chat:ratelimit:${channelId}:${userId}`;
  const currentCount = (await redis.eval(RATE_LIMIT_LUA, 1, key, String(windowSeconds))) as number;
  return currentCount > count;
}

export async function logModerationEvent(payload: {
  action: ChatModerationAction;
  channelId: string;
  moderatorId: string;
  targetUserId?: string;
  reason?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.chatModerationEvent.create({
    data: {
      action: payload.action,
      channelId: payload.channelId,
      moderatorId: payload.moderatorId,
      targetUserId: payload.targetUserId,
      reason: payload.reason,
      details: payload.details as any,
    },
  });
}

export async function deleteMessageFromHistory(
  targetUsername: string,
  msgId: string
): Promise<{ deleted: boolean; messageContent?: string }> {
  const channelKey = `chat:history:${targetUsername}`;
  const history = await redis.zrange(channelKey, 0, -1);

  for (const entry of history) {
    try {
      const parsed = JSON.parse(entry) as { msgId?: string; message?: string };
      if (parsed.msgId === msgId) {
        await redis.zrem(channelKey, entry);
        return {
          deleted: true,
          messageContent:
            typeof parsed.message === 'string' && parsed.message.length > 0
              ? parsed.message
              : undefined,
        };
      }
    } catch {
      continue;
    }
  }

  return { deleted: false };
}
