import { serve } from '@hono/node-server';
import { createNodeWebSocket, type ModifiedWebSocket } from '@hctv/hono-ws';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { lucia } from '@hctv/auth';
import { getCookie } from 'hono/cookie';
import { getPersonalChannel } from './utils/personalChannel.js';
import { ChatModerationAction, getRedisConnection, prisma } from '@hctv/db';
import uFuzzy from '@leeoniya/ufuzzy';
import { randomString } from './utils/randomString.js';

const redis = getRedisConnection();
const MESSAGE_HISTORY_SIZE = 100;
const MESSAGE_TTL = 60 * 60 * 24;
const MODERATION_SETTINGS_CACHE_TTL_SECONDS = 30;
const threed = await readFile('./src/3d.txt', 'utf-8');
const uf = new uFuzzy();

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

async function isRateLimited(
  channelId: string,
  userId: string,
  count: number,
  windowSeconds: number
): Promise<boolean> {
  const key = `chat:ratelimit:${channelId}:${userId}`;
  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, windowSeconds);
  }

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
        },
      });

      if (!channel) {
        ws.close();
        return;
      }

      const isModerator = Boolean(
        chatUser &&
        !chatUser.isBot &&
        (channel.ownerId === chatUser.id ||
          channel.managers.some((manager) => manager.id === chatUser.id))
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

      socketState.targetUsername = username;
      socketState.channelId = channel.id;
      socketState.chatUser = chatUser;
      socketState.personalChannel = personalChannel;
      socketState.viewerId = socket.viewerId;
      socketState.isModerator = isModerator;

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
      // if prematurely exiting due to authentication issues
      console.log('client disconnected');
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

      await redis.del(`viewer:${socketState.targetUsername}:${socketState.viewerId}`);
    },
    async onMessage(evt, ws) {
      try {
        const socket = ws as unknown as ChatSocket;
        const socketState = resolveSocketState(socket);
        const msg = JSON.parse(evt.data.toString());

        if (msg.type === 'ping') {
          await redis.setex(
            `viewer:${socketState.targetUsername}:${socketState.viewerId}`,
            30,
            '1'
          );
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (msg.type === 'mod:deleteMessage') {
          if (
            !socketState.isModerator ||
            !socketState.chatUser ||
            !socketState.targetUsername ||
            !socketState.channelId
          ) {
            return;
          }

          const msgId = typeof msg.msgId === 'string' ? msg.msgId : '';
          if (!msgId) {
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'INVALID_REQUEST',
                message: 'Invalid message id.',
              })
            );
            return;
          }

          const deleted = await deleteMessageFromHistory(socketState.targetUsername, msgId);
          if (!deleted) {
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'NOT_FOUND',
                message: 'Message not found.',
              })
            );
            return;
          }

          await logModerationEvent({
            action: ChatModerationAction.MESSAGE_DELETED,
            channelId: socketState.channelId,
            moderatorId: socketState.chatUser.id,
            reason: 'Message deleted by moderator',
            details: { msgId },
          });

          broadcastToChannel(socketState.targetUsername, socket, { type: 'messageDeleted', msgId });

          return;
        }

        if (
          msg.type === 'mod:timeoutUser' ||
          msg.type === 'mod:banUser' ||
          msg.type === 'mod:unbanUser' ||
          msg.type === 'mod:liftTimeout'
        ) {
          if (
            !socketState.isModerator ||
            !socketState.chatUser ||
            !socketState.targetUsername ||
            !socketState.channelId
          ) {
            return;
          }

          const targetUserId = typeof msg.targetUserId === 'string' ? msg.targetUserId : '';
          const targetUsername =
            typeof msg.targetUsername === 'string' ? msg.targetUsername : 'that user';

          if (!targetUserId || targetUserId === socketState.chatUser.id) {
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'INVALID_TARGET',
                message: 'Invalid moderation target.',
              })
            );
            return;
          }

          const targetUserExists = await prisma.user.count({ where: { id: targetUserId } });
          if (targetUserExists === 0) {
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'INVALID_TARGET',
                message: 'Target user no longer exists.',
              })
            );
            return;
          }

          if (msg.type === 'mod:unbanUser' || msg.type === 'mod:liftTimeout') {
            await prisma.chatUserBan.deleteMany({
              where: {
                channelId: socketState.channelId,
                userId: targetUserId,
              },
            });

            await logModerationEvent({
              action: ChatModerationAction.USER_UNBANNED,
              channelId: socketState.channelId,
              moderatorId: socketState.chatUser.id,
              targetUserId,
              reason: 'User unbanned in chat',
            });

            await broadcastRestrictionStateToUser(
              socketState.targetUsername,
              targetUserId,
              socketState.channelId,
              socket
            );

            broadcastToChannel(socketState.targetUsername, socket, {
              type: 'systemMsg',
              message: `${targetUsername} can chat again.`,
            });
            return;
          }

          const reason =
            typeof msg.reason === 'string' && msg.reason.trim().length > 0
              ? msg.reason.trim().slice(0, 250)
              : msg.type === 'mod:timeoutUser'
                ? 'Timed out by moderator'
                : 'Banned by moderator';
          const durationSeconds =
            msg.type === 'mod:timeoutUser'
              ? Math.min(Math.max(Number(msg.durationSeconds) || 300, 10), 60 * 60 * 24)
              : null;
          const expiresAt = durationSeconds ? new Date(Date.now() + durationSeconds * 1000) : null;

          await prisma.chatUserBan.upsert({
            where: {
              channelId_userId: {
                channelId: socketState.channelId,
                userId: targetUserId,
              },
            },
            create: {
              channelId: socketState.channelId,
              userId: targetUserId,
              bannedById: socketState.chatUser.id,
              reason,
              expiresAt,
            },
            update: {
              bannedById: socketState.chatUser.id,
              reason,
              expiresAt,
            },
          });

          await logModerationEvent({
            action:
              msg.type === 'mod:timeoutUser'
                ? ChatModerationAction.USER_TIMEOUT
                : ChatModerationAction.USER_BANNED,
            channelId: socketState.channelId,
            moderatorId: socketState.chatUser.id,
            targetUserId,
            reason,
            details: durationSeconds ? { durationSeconds } : undefined,
          });

          await broadcastRestrictionStateToUser(
            socketState.targetUsername,
            targetUserId,
            socketState.channelId,
            socket
          );

          broadcastToChannel(socketState.targetUsername, socket, {
            type: 'systemMsg',
            message:
              msg.type === 'mod:timeoutUser'
                ? `${targetUsername} was timed out for ${durationSeconds}s.`
                : `${targetUsername} was banned.`,
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
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: restriction.type === 'timeout' ? 'TIMED_OUT' : 'BANNED',
                message:
                  restriction.type === 'timeout'
                    ? 'You are currently timed out in this chat.'
                    : 'You are currently banned from this chat.',
                restriction,
              })
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
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'RATE_LIMIT',
                message: 'You are sending messages too fast.',
              })
            );
            return;
          }

          if (!isModerator && moderationSettings.slowModeSeconds > 0) {
            const slowModeKey = `chat:slowmode:${channelId}:${chatUser.id}`;
            const timeRemaining = await redis.ttl(slowModeKey);
            if (timeRemaining > 0) {
              socket.send(
                JSON.stringify({
                  type: 'moderationError',
                  code: 'SLOW_MODE',
                  message: `Slow mode is on. Wait ${timeRemaining}s.`,
                })
              );
              return;
            }
            await redis.setex(slowModeKey, moderationSettings.slowModeSeconds, '1');
          }

          const message = (msg.message as string).trim();
          if (!message) {
            return;
          }
          if (message.length > moderationSettings.maxMessageLength) {
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'MESSAGE_TOO_LONG',
                message: `Message exceeds ${moderationSettings.maxMessageLength} characters.`,
              })
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
            socket.send(
              JSON.stringify({
                type: 'moderationError',
                code: 'BLOCKED_TERM',
                message: 'Message blocked by channel moderation.',
              })
            );
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
            },
            message,
            msgId,
            type: 'message',
          };

          const redisStr = JSON.stringify(msgObj);
          const msgStr = JSON.stringify(msgObj);

          const channelKey = `chat:history:${targetUsername}`;
          await redis.zadd(channelKey, Date.now(), redisStr);
          await redis.zremrangebyrank(channelKey, 0, -MESSAGE_HISTORY_SIZE - 1);
          await redis.expire(channelKey, MESSAGE_TTL);

          broadcastToChannel(targetUsername, socket, msgObj as unknown as Record<string, unknown>);
        }
        if (msg.type === 'emojiMsg') {
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
          console.log('emoji search request:', msg);
          const searchTerm = msg.searchTerm as string;

          const emojis = await redis.hgetall('emojis');
          const emojiKeys = Object.keys(emojis);
          const idxs = uf.filter(emojiKeys, searchTerm);
          console.log(`Emoji search for "${searchTerm}" found ${idxs?.length || 0} results.`);

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
            console.log(`Sending emoji search results: ${results.join(', ')}`);
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

interface ChatUser {
  id: string;
  username: string;
  pfpUrl: string;
  displayName?: string;
  isBot: boolean;
}

interface ChatModerationSettingsShape {
  blockedTerms: string[];
  slowModeSeconds: number;
  maxMessageLength: number;
  rateLimitCount: number;
  rateLimitWindowSeconds: number;
}

interface ChatRestrictionState {
  type: 'timeout' | 'ban';
  reason: string;
  expiresAt: Date | null;
}

interface ChatSocket {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
  close: () => void;
  wss: {
    clients: Set<unknown>;
  };
  targetUsername?: string;
  channelId?: string;
  chatUser?: ChatUser | null;
  personalChannel?: any;
  viewerId?: string;
  isModerator?: boolean;
  raw?:
    | (ModifiedWebSocket & {
        targetUsername?: string;
        channelId?: string;
        chatUser?: ChatUser | null;
        personalChannel?: any;
        isModerator?: boolean;
      })
    | null;
}
