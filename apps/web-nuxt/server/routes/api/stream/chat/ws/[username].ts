import uFuzzy from '@leeoniya/ufuzzy';
import type { Peer } from 'crossws';
import { lucia } from '@hctv/auth';
import { ChatModerationAction, getRedisConnection, prisma } from '@hctv/db';
import {
  recordChatConnectionAccepted,
  recordChatConnectionRejected,
  recordChatDisconnect,
  recordChatError,
  recordChatModerationBlock,
  recordDeliveredChatMessage,
  recordDeliveredChatMessageBytes,
  recordEmojiSearchResults,
  recordHistoryMessagesLoaded,
  recordIncomingChatMessage,
  recordUniqueChatter,
  setChannelHistorySize,
  setChatModerationState,
  startChatMessageTimer,
} from '../../../../../utils/chat/metrics';
import {
  MESSAGE_HISTORY_SIZE,
  MESSAGE_TTL,
  broadcastRestrictionStateToUser,
  broadcastToChannel,
  containsBlockedTerm,
  deleteMessageFromHistory,
  getActiveRestriction,
  getCachedModerationSettings,
  getMetricsMessageType,
  isRateLimited,
  logModerationEvent,
  registerSocket,
  sendChatAccessState,
  unregisterSocket,
} from '../../../../../utils/chat/service';
import {
  handleDeleteMessageCommand,
  handleUserRestrictionCommand,
  sendModerationError,
} from '../../../../../utils/chat/moderation';
import { randomString } from '../../../../../utils/chat/randomString';
import type {
  ChatModerationCommand,
  ChatSocket,
  ChatUser,
} from '../../../../../utils/chat/types';
import type { IncomingMessage } from '../../../../../utils/chat/service';

const redis = getRedisConnection();
const uf = new uFuzzy();
const OPEN = 1;

// one ChatSocket per peer; the peer id is stable for the lifetime of a connection
const sockets = new WeakMap<Peer, ChatSocket>();

function wrapPeer(peer: Peer): ChatSocket {
  const socket: ChatSocket = {
    peer,
    send: (data) => peer.send(data),
    close: () => peer.close(),
    isOpen: () => peer.websocket.readyState === OPEN,
  };
  sockets.set(peer, socket);
  return socket;
}

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export default defineWebSocketHandler({
  async open(peer) {
    const socket = wrapPeer(peer);
    const url = new URL(peer.request.url);
    const username = url.pathname.split('/').pop() ?? '';

    let authMethod = 'unknown';
    const token = parseCookie(peer.request.headers.get('cookie'), lucia.sessionCookieName);
    const grant = url.searchParams.get('grant');
    const authHeader = peer.request.headers.get('authorization');
    const botAuth = url.searchParams.get('botAuth');

    if (!token && (!grant || grant === 'null') && !authHeader && !botAuth) {
      recordChatConnectionRejected(authMethod, 'missing_auth');
      peer.close();
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
    } else if (botAuth && botAuth.trim().length > 0) {
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
        authMethod = 'bot_api_key';
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
          authMethod = 'session';
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
      recordChatConnectionRejected(authMethod, 'auth_failed');
      peer.close();
      return;
    }

    if (!chatUser && dbGrant) {
      authMethod = 'obs_grant';
    }

    if (dbGrant && dbGrant.name !== username) {
      recordChatConnectionRejected(authMethod, 'grant_mismatch');
      peer.close();
      return;
    }
    const channel = await prisma.channel.findUnique({
      where: { name: username },
      select: {
        id: true,
        ownerId: true,
        managers: { select: { id: true } },
        chatModerators: { select: { id: true } },
        chatModeratorBots: { select: { id: true } },
      },
    });

    if (!channel) {
      recordChatConnectionRejected(authMethod, 'channel_not_found');
      peer.close();
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
        isPlatformAdmin: chatUser.isBot ? false : Boolean(moderatorUser?.isAdmin),
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

    // the peer may have disconnected while we were awaiting the database
    if (!socket.isOpen()) return;

    socket.targetUsername = username;
    socket.channelId = channel.id;
    socket.chatUser = chatUser;
    socket.personalChannel = personalChannel;
    socket.viewerId = randomString(10);
    socket.isModerator = isModerator;
    socket.excludeFromViewerCount = Boolean(dbGrant);
    socket.metricsTracked = true;
    socket.metricsAuthMethod = authMethod;
    registerSocket(socket);

    recordChatConnectionAccepted(username, authMethod);
    setChatModerationState(username, {
      blockedTerms: moderationSettings.blockedTerms.length,
      maxMessageLength: moderationSettings.maxMessageLength,
      rateLimitCount: moderationSettings.rateLimitCount,
      rateLimitWindowSeconds: moderationSettings.rateLimitWindowSeconds,
      slowModeSeconds: moderationSettings.slowModeSeconds,
    });

    socket.send(
      JSON.stringify({
        type: 'session',
        viewer: chatUser ? { id: chatUser.id, username: chatUser.username } : null,
        permissions: { canModerate: isModerator },
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
      recordHistoryMessagesLoaded(username, messages.length);
      socket.send(
        JSON.stringify({
          type: 'history',
          messages: messages.map((msg) => JSON.parse(msg)),
        })
      );
    }
    setChannelHistorySize(username, messages.length);
  },

  async close(peer) {
    const socket = sockets.get(peer);
    sockets.delete(peer);
    if (!socket) return;
    if (process.env.NODE_ENV !== 'production') console.log('client disconnected');
    if (!socket.targetUsername) return;

    unregisterSocket(socket);

    if (socket.metricsTracked) {
      recordChatDisconnect(socket.targetUsername, socket.metricsAuthMethod ?? 'unknown');
      socket.metricsTracked = false;
    }

    const streamInfo = await prisma.streamInfo.findUnique({
      where: { username: socket.targetUsername },
      select: { viewers: true },
    });

    if (!streamInfo) return;

    if (!socket.excludeFromViewerCount) {
      await redis.del(`viewer:${socket.targetUsername}:${socket.viewerId}`);
    }
  },

  async message(peer, message) {
    const socket = sockets.get(peer);
    if (!socket) return;

    let outcome = 'ignored';
    let messageType = 'unknown';
    let stopTimer: ReturnType<typeof startChatMessageTimer> | null = null;

    try {
      const rawPayload = message.text();
      const msg = JSON.parse(rawPayload) as IncomingMessage;
      messageType = getMetricsMessageType(msg.type);
      recordIncomingChatMessage(messageType, Buffer.byteLength(rawPayload));
      stopTimer = startChatMessageTimer(messageType);

      if (msg.type === 'ping') {
        if (!socket.excludeFromViewerCount) {
          await redis.setex(`viewer:${socket.targetUsername}:${socket.viewerId}`, 30, '1');
        }
        socket.send(JSON.stringify({ type: 'pong' }));
        outcome = 'pong';
        return;
      }

      if (msg.type === 'mod:deleteMessage') {
        await handleDeleteMessageCommand(socket, socket, msg as ChatModerationCommand, {
          deleteMessageFromHistory,
          logModerationEvent,
          broadcastToChannel,
        });
        outcome = 'moderation';
        return;
      }

      if (
        msg.type === 'mod:timeoutUser' ||
        msg.type === 'mod:banUser' ||
        msg.type === 'mod:unbanUser' ||
        msg.type === 'mod:liftTimeout'
      ) {
        await handleUserRestrictionCommand(socket, socket, msg as ChatModerationCommand, {
          logModerationEvent,
          broadcastRestrictionStateToUser,
          broadcastToChannel,
        });
        outcome = 'moderation';
        return;
      }

      if (msg.type === 'message') {
        if (!socket.chatUser || !socket.personalChannel || !socket.channelId || !socket.targetUsername) {
          return;
        }

        const chatUser = socket.chatUser;
        const channelId = socket.channelId;
        const targetUsername = socket.targetUsername;
        const isModerator = Boolean(socket.isModerator);

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
          outcome = 'blocked';
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
          recordChatModerationBlock('rate_limit');
          outcome = 'rate_limited';
          return;
        }

        if (!isModerator && moderationSettings.slowModeSeconds > 0) {
          const slowModeKey = `chat:slowmode:${channelId}:${chatUser.id}`;
          const timeRemaining = await redis.ttl(slowModeKey);
          if (timeRemaining > 0) {
            sendModerationError(socket, 'SLOW_MODE', `Slow mode is on. Wait ${timeRemaining}s.`);
            recordChatModerationBlock('slow_mode');
            outcome = 'slow_mode';
            return;
          }
          await redis.setex(slowModeKey, moderationSettings.slowModeSeconds, '1');
        }

        const text = (msg.message as string).trim();
        if (!text) {
          return;
        }
        if (text.length > moderationSettings.maxMessageLength) {
          sendModerationError(
            socket,
            'MESSAGE_TOO_LONG',
            `Message exceeds ${moderationSettings.maxMessageLength} characters.`
          );
          recordChatModerationBlock('message_too_long');
          outcome = 'message_too_long';
          return;
        }

        const blockedTerm = containsBlockedTerm(text, moderationSettings.blockedTerms);
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
          recordChatModerationBlock('blocked_term');
          sendModerationError(socket, 'BLOCKED_TERM', 'Message blocked by channel moderation.');
          outcome = 'blocked_term';
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
          message: text,
          msgId,
          type: 'message',
        };

        const redisStr = JSON.stringify(msgObj);

        const channelKey = `chat:history:${targetUsername}`;
        await redis.zadd(channelKey, Date.now(), redisStr);
        await redis.zremrangebyrank(channelKey, 0, -MESSAGE_HISTORY_SIZE - 1);
        await redis.expire(channelKey, MESSAGE_TTL);
        const historySize = await redis.zcard(channelKey);
        setChannelHistorySize(targetUsername, historySize);

        broadcastToChannel(targetUsername, socket, msgObj as unknown as Record<string, unknown>);
        recordDeliveredChatMessage(chatUser.isBot ? 'bot' : 'user');
        recordDeliveredChatMessageBytes(chatUser.isBot ? 'bot' : 'user', Buffer.byteLength(text));
        const isFirstMessageFromUser =
          (await redis.sadd(`chat:unique-chatters:${targetUsername}`, chatUser.id)) === 1;

        if (isFirstMessageFromUser) {
          recordUniqueChatter(chatUser.isBot ? 'bot' : 'user');
        }
        outcome = 'broadcast';
      }

      if (msg.type === 'emojiMsg') {
        if (!socket.chatUser) return;
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

        socket.send(JSON.stringify({ type: 'emojiMsgResponse', emojis: emojiMap }));
        outcome = 'emoji_lookup';
      }

      if (msg.type === 'emojiSearch') {
        if (!socket.chatUser) return;
        const rawSearchTerm = (msg.searchTerm as string)?.trim() ?? '';
        if (!rawSearchTerm || rawSearchTerm.length > 50) {
          socket.send(JSON.stringify({ type: 'emojiSearchResponse', results: [] }));
          recordEmojiSearchResults('empty', 0);
          outcome = 'emoji_search_empty';
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

          socket.send(JSON.stringify({ type: 'emojiSearchResponse', results }));
          recordEmojiSearchResults('matched', results.length);
          outcome = 'emoji_search';
        } else {
          socket.send(JSON.stringify({ type: 'emojiSearchResponse', results: [] }));
          recordEmojiSearchResults('no_match', 0);
          outcome = 'emoji_search_empty';
        }
      }
    } catch (e) {
      outcome = 'error';
      recordChatError('on_message');
      console.error('Error processing message:', e);
    } finally {
      stopTimer?.({ type: messageType, outcome });
    }
  },
});
