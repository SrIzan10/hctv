import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hctv/hono-ws';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { lucia } from '@hctv/auth';
import { getCookie } from 'hono/cookie';
import { getPersonalChannel } from './utils/personalChannel.js';
import { ChatModerationAction, getRedisConnection, prisma } from '@hctv/db';
import uFuzzy from '@leeoniya/ufuzzy';
import {
  handleDeleteMessageCommand,
  handleUserRestrictionCommand,
  sendModerationError,
} from './utils/moderation.js';
import { randomString } from './utils/randomString.js';
import type {
  ChatModerationCommand,
  ChatModerationSettingsShape,
  ChatRestrictionState,
  ChatSocket,
  ChatUser,
} from './types/chat.js';

const redis = getRedisConnection();
const MESSAGE_HISTORY_SIZE = 100;
const MESSAGE_TTL = 60 * 60 * 24;
const MODERATION_SETTINGS_CACHE_TTL_SECONDS = 30;
const threed = await readFile('./src/3d.txt', 'utf-8');
const uf = new uFuzzy();

type IncomingMessage = {
  type?: string;
  [key: string]: unknown;
};

const DEFAULT_MODERATION_SETTINGS: ChatModerationSettingsShape = {
  blockedTerms: [],
  slowModeSeconds: 0,
  maxMessageLength: 400,
  rateLimitCount: 8,
  rateLimitWindowSeconds: 10,
};

function normalizeModerationSettings(
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

function containsBlockedTerm(message: string, blockedTerms: string[]): string | null {
  const normalizedMessage = message.toLowerCase();

  for (const term of blockedTerms) {
    const regex = new RegExp(`(^|\\W)${escapeRegExp(term)}($|\\W)`, 'i');
    if (regex.test(normalizedMessage)) {
      return term;
    }
  }

  return null;
}

async function getCachedModerationSettings(
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

function resolveSocketState(socket: ChatSocket): ChatSocket {
  return (socket.raw as unknown as ChatSocket | undefined) ?? socket;
}

function broadcastToChannel(
  targetUsername: string,
  ws: ChatSocket,
  payload: Record<string, unknown>
) {
  ws.wss.clients.forEach((clientSocket: unknown) => {
    const client = clientSocket as ChatSocket;
    const clientState = resolveSocketState(client);
    if (client.readyState === client.OPEN && clientState.targetUsername === targetUsername) {
      client.send(JSON.stringify(payload));
    }
  });
}

async function getActiveRestriction(
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

async function sendChatAccessState(socket: ChatSocket, channelId: string, userId: string) {
  const restriction = await getActiveRestriction(channelId, userId);
  socket.send(
    JSON.stringify({
      type: 'chatAccess',
      canSend: !restriction,
      restriction,
    })
  );
}

async function broadcastRestrictionStateToUser(
  targetUsername: string,
  targetUserId: string,
  channelId: string,
  ws: ChatSocket
) {
  const restriction = await getActiveRestriction(channelId, targetUserId);
  ws.wss.clients.forEach((clientSocket: unknown) => {
    const client = clientSocket as ChatSocket;
    const clientState = resolveSocketState(client);
    if (
      client.readyState === client.OPEN &&
      clientState.targetUsername === targetUsername &&
      clientState.chatUser?.id === targetUserId
    ) {
      client.send(
        JSON.stringify({
          type: 'chatAccess',
          canSend: !restriction,
          restriction,
        })
      );
    }
  });
}

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

async function isRateLimited(
  channelId: string,
  userId: string,
  count: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `chat:ratelimit:${channelId}:${userId}`;
  const currentCount = (await redis.eval(RATE_LIMIT_LUA, 1, key, String(windowSeconds))) as number;
  return currentCount > count;
}

async function logModerationEvent(payload: {
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

async function deleteMessageFromHistory(targetUsername: string, msgId: string): Promise<boolean> {
  const channelKey = `chat:history:${targetUsername}`;
  const history = await redis.zrange(channelKey, 0, -1);

  for (const entry of history) {
    try {
      const parsed = JSON.parse(entry) as { msgId?: string };
      if (parsed.msgId === msgId) {
        await redis.zrem(channelKey, entry);
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get('/', async (c) => {
  return c.text(threed);
});

app.get('/up', async (c) => {
  return c.text('it works');
});

app.get(
  '/ws/:username',
  upgradeWebSocket((c) => ({
    async onOpen(evt, ws) {
      const token = getCookie(c, 'auth_session');
      const grant = c.req.query('grant');
      const authHeader = c.req.header('Authorization');
      const botAuth = c.req.query('botAuth');

      if (!token && (!grant || grant === 'null') && !authHeader && !botAuth) {
        ws.close();
        return;
      }

      let chatUser: ChatUser | null = null;
      let personalChannel: any = null;

      let apiKey: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const extractedKey = authHeader.substring(7);
        if (extractedKey.startsWith('hctvb_')) {
          apiKey = extractedKey;
        }
      } else if (botAuth && typeof botAuth === 'string' && botAuth.trim().length > 0) {
        if (botAuth.startsWith('hctvb_')) {
          apiKey = botAuth;
        }
      }

      if (apiKey) {
        const botAccount = await prisma.botApiKey.findUnique({
          where: { key: apiKey },
          include: { botAccount: true },
        });

        if (botAccount) {
          chatUser = {
            id: botAccount.botAccount.id,
            username: botAccount.botAccount.slug,
            pfpUrl: botAccount.botAccount.pfpUrl,
            displayName: botAccount.botAccount.displayName,
            isBot: true,
            moderatorUserId: botAccount.botAccount.ownerId,
            isPlatformAdmin: false,
            channelRole: null,
          };

          personalChannel = {
            id: botAccount.botAccount.id,
            name: botAccount.botAccount.slug,
          };
        }
      }

      if (!chatUser && token) {
        const session = await lucia.validateSession(token);
        if (session.user) {
          const userChannel = await getPersonalChannel(session.user.id);
          if (userChannel) {
            chatUser = {
              id: session.user.id,
              username: userChannel.name,
              pfpUrl: session.user.pfpUrl,
              isBot: false,
              moderatorUserId: session.user.id,
              isPlatformAdmin: Boolean(session.user.isAdmin),
              channelRole: null,
            };
            personalChannel = userChannel;
          }
        }
      }

      const dbGrant =
        grant && grant !== 'null'
          ? await prisma.channel.findFirst({
              where: { obsChatGrantToken: grant },
            })
          : null;

      if (!chatUser && !dbGrant) {
        ws.close();
        return;
      }

      const { username } = c.req.param();
      if (dbGrant && dbGrant.name !== username) {
        ws.close();
        return;
      }

      const channel = await prisma.channel.findUnique({
        where: { name: username },
        select: {
          id: true,
          ownerId: true,
          managers: {
            select: {
              id: true,
            },
          },
          chatModerators: {
            select: {
              id: true,
            },
          },
          chatModeratorBots: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!channel) {
        ws.close();
        return;
      }

      let channelRole: ChatUser['channelRole'] = null;
      const activeChatUser = chatUser;
      if (activeChatUser) {
        if (activeChatUser.isBot) {
          if (channel.chatModeratorBots.some((bot) => bot.id === activeChatUser.id)) {
            channelRole = 'botModerator';
          }
        } else if (channel.ownerId === activeChatUser.id) {
          channelRole = 'owner';
        } else if (channel.managers.some((manager) => manager.id === activeChatUser.id)) {
          channelRole = 'manager';
        } else if (channel.chatModerators.some((moderator) => moderator.id === activeChatUser.id)) {
          channelRole = 'chatModerator';
        }
      }

      if (chatUser) {
        const moderatorUser = await prisma.user.findUnique({
          where: { id: chatUser.moderatorUserId },
          select: { isAdmin: true },
        });

        chatUser = {
          ...chatUser,
          isPlatformAdmin: Boolean(moderatorUser?.isAdmin),
          channelRole,
        };
      }

      const isModerator = Boolean(
        chatUser &&
        (chatUser.isPlatformAdmin ||
          chatUser.channelRole === 'owner' ||
          chatUser.channelRole === 'manager' ||
          chatUser.channelRole === 'chatModerator' ||
          chatUser.channelRole === 'botModerator')
      );

      const moderationSettings = await getCachedModerationSettings(channel.id);

      const socket = ws as unknown as ChatSocket;
      const socketState = resolveSocketState(socket);

      socket.targetUsername = username;
      socket.channelId = channel.id;
      socket.chatUser = chatUser;
      socket.personalChannel = personalChannel;
      socket.viewerId = randomString(10);
      socket.isModerator = isModerator;
      socket.excludeFromViewerCount = Boolean(dbGrant);

      socketState.targetUsername = username;
      socketState.channelId = channel.id;
      socketState.chatUser = chatUser;
      socketState.personalChannel = personalChannel;
      socketState.viewerId = socket.viewerId;
      socketState.isModerator = isModerator;
      socketState.excludeFromViewerCount = Boolean(dbGrant);

      socket.send(
        JSON.stringify({
          type: 'session',
          viewer: chatUser
            ? {
                id: chatUser.id,
                username: chatUser.username,
              }
            : null,
          permissions: {
            canModerate: isModerator,
          },
          moderation: {
            hasBlockedTerms: moderationSettings.blockedTerms.length > 0,
            slowModeSeconds: moderationSettings.slowModeSeconds,
            maxMessageLength: moderationSettings.maxMessageLength,
          },
        })
      );

      if (chatUser && !chatUser.isBot) {
        await sendChatAccessState(socket, channel.id, chatUser.id);
      }

      const channelKey = `chat:history:${username}`;
      const messages = await redis.zrange(channelKey, 0, MESSAGE_HISTORY_SIZE - 1);

      if (messages.length > 0) {
        socket.send(
          JSON.stringify({
            type: 'history',
            messages: messages.map((msg) => JSON.parse(msg)),
          })
        );
      }
    },
    async onClose(evt, ws) {
      const socket = ws as unknown as ChatSocket;
      const socketState = resolveSocketState(socket);
      if (process.env.NODE_ENV !== 'production') console.log('client disconnected');
      if (!socketState.targetUsername) return;

      const streamInfo = await prisma.streamInfo.findUnique({
        where: {
          username: socketState.targetUsername,
        },
        select: {
          viewers: true,
        },
      });

      if (!streamInfo) return;

      if (!socketState.excludeFromViewerCount) {
        await redis.del(`viewer:${socketState.targetUsername}:${socketState.viewerId}`);
      }
    },
    async onMessage(evt, ws) {
      try {
        const socket = ws as unknown as ChatSocket;
        const socketState = resolveSocketState(socket);
        const msg = JSON.parse(evt.data.toString()) as IncomingMessage;

        if (msg.type === 'ping') {
          if (!socketState.excludeFromViewerCount) {
            await redis.setex(
              `viewer:${socketState.targetUsername}:${socketState.viewerId}`,
              30,
              '1'
            );
          }
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'mod:deleteMessage') {
          await handleDeleteMessageCommand(socket, socketState, msg as ChatModerationCommand, {
            deleteMessageFromHistory,
            logModerationEvent,
            broadcastToChannel,
          });
          return;
        }

        if (
          msg.type === 'mod:timeoutUser' ||
          msg.type === 'mod:banUser' ||
          msg.type === 'mod:unbanUser' ||
          msg.type === 'mod:liftTimeout'
        ) {
          await handleUserRestrictionCommand(socket, socketState, msg as ChatModerationCommand, {
            logModerationEvent,
            broadcastRestrictionStateToUser,
            broadcastToChannel,
          });
          return;
        }

        if (msg.type === 'message') {
          if (
            !socketState.chatUser ||
            !socketState.personalChannel ||
            !socketState.channelId ||
            !socketState.targetUsername
          ) {
            return;
          }

          const chatUser = socketState.chatUser;
          const channelId = socketState.channelId;
          const targetUsername = socketState.targetUsername;
          const isModerator = Boolean(socketState.isModerator);

          if (!chatUser || !channelId || !targetUsername) {
            return;
          }

          const moderationSettings = await getCachedModerationSettings(channelId);

          const restriction = await getActiveRestriction(channelId, chatUser.id);
          if (restriction) {
            sendModerationError(
              socket,
              restriction.type === 'timeout' ? 'TIMED_OUT' : 'BANNED',
              restriction.type === 'timeout'
                ? 'You are currently timed out in this chat.'
                : 'You are currently banned from this chat.',
              restriction
            );

            await sendChatAccessState(socket, channelId, chatUser.id);
            return;
          }

          if (
            !isModerator &&
            (await isRateLimited(
              channelId,
              chatUser.id,
              moderationSettings.rateLimitCount,
              moderationSettings.rateLimitWindowSeconds
            ))
          ) {
            sendModerationError(socket, 'RATE_LIMIT', 'You are sending messages too fast.');
            return;
          }

          if (!isModerator && moderationSettings.slowModeSeconds > 0) {
            const slowModeKey = `chat:slowmode:${channelId}:${chatUser.id}`;
            const timeRemaining = await redis.ttl(slowModeKey);
            if (timeRemaining > 0) {
              sendModerationError(socket, 'SLOW_MODE', `Slow mode is on. Wait ${timeRemaining}s.`);
              return;
            }
            await redis.setex(slowModeKey, moderationSettings.slowModeSeconds, '1');
          }

          const message = (msg.message as string).trim();
          if (!message) {
            return;
          }
          if (message.length > moderationSettings.maxMessageLength) {
            sendModerationError(
              socket,
              'MESSAGE_TOO_LONG',
              `Message exceeds ${moderationSettings.maxMessageLength} characters.`
            );
            return;
          }

          const blockedTerm = containsBlockedTerm(message, moderationSettings.blockedTerms);
          if (blockedTerm) {
            if (!chatUser.isBot) {
              await logModerationEvent({
                action: ChatModerationAction.MESSAGE_BLOCKED,
                channelId,
                moderatorId: chatUser.id,
                targetUserId: chatUser.id,
                reason: 'Blocked term matched',
                details: { blockedTerm },
              });
            }
            sendModerationError(socket, 'BLOCKED_TERM', 'Message blocked by channel moderation.');
            return;
          }

          const msgId = crypto.randomUUID();
          const msgObj = {
            user: {
              id: chatUser.id,
              username: chatUser.username,
              pfpUrl: chatUser.pfpUrl,
              displayName: chatUser.displayName,
              isBot: chatUser.isBot || false,
              isPlatformAdmin: chatUser.isPlatformAdmin,
              channelRole: chatUser.channelRole,
            },
            message,
            msgId,
            type: 'message',
          };

          const redisStr = JSON.stringify(msgObj);

          const channelKey = `chat:history:${targetUsername}`;
          await redis.zadd(channelKey, Date.now(), redisStr);
          await redis.zremrangebyrank(channelKey, 0, -MESSAGE_HISTORY_SIZE - 1);
          await redis.expire(channelKey, MESSAGE_TTL);

          broadcastToChannel(targetUsername, socket, msgObj as unknown as Record<string, unknown>);
        }
        if (msg.type === 'emojiMsg') {
          if (!socketState.chatUser) return;
          const emojis = msg.emojis as string[];
          const emojiMap: Record<string, string> = {};

          await Promise.all(
            emojis.map(async (emoji) => {
              let url = await redis.hget('emojis', emoji);

              if (!url) {
                url = await redis.hget(`emojis:${emoji}`, 'url');
              }
              if (!url) {
                url = await redis.hget(`emoji:${emoji}`, 'url');
              }

              emojiMap[emoji] = url ?? '';
            })
          );

          ws.send(
            JSON.stringify({
              type: 'emojiMsgResponse',
              emojis: emojiMap,
            })
          );
        }
        if (msg.type === 'emojiSearch') {
          if (!socketState.chatUser) return;
          const rawSearchTerm = (msg.searchTerm as string)?.trim() ?? '';
          if (!rawSearchTerm || rawSearchTerm.length > 50) {
            ws.send(JSON.stringify({ type: 'emojiSearchResponse', results: [] }));
            return;
          }
          const searchTerm = rawSearchTerm;

          const emojis = await redis.hgetall('emojis');
          const emojiKeys = Object.keys(emojis);
          const idxs = uf.filter(emojiKeys, searchTerm);

          if (idxs && idxs.length > 0) {
            const results: string[] = [];

            if (idxs.length <= 150) {
              const info = uf.info(idxs, emojiKeys, searchTerm);
              const order = uf.sort(info, emojiKeys, searchTerm);
              for (let i = 0; i < order.length && i < 10; i++) {
                results.push(emojiKeys[idxs[order[i]]]);
              }
            } else {
              for (let i = 0; i < idxs.length && i < 10; i++) {
                results.push(emojiKeys[idxs[i]]);
              }
            }

            ws.send(
              JSON.stringify({
                type: 'emojiSearchResponse',
                results: results,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: 'emojiSearchResponse',
                results: [],
              })
            );
          }
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    },
  }))
);

const server = serve(
  {
    fetch: app.fetch,
    port: 8000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
injectWebSocket(server);
