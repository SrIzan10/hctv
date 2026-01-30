import { serve } from '@hono/node-server';
import { createNodeWebSocket, type ModifiedWebSocket } from '@hctv/hono-ws';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { lucia } from '@hctv/auth';
import { getCookie } from 'hono/cookie';
import { getPersonalChannel } from './utils/personalChannel.js';
import { getRedisConnection, prisma, type BotAccount, type BotApiKey, type User } from '@hctv/db';
import uFuzzy from '@leeoniya/ufuzzy';
import { randomString } from './utils/randomString.js';

const redis = getRedisConnection();
const MESSAGE_HISTORY_SIZE = 15;
const MESSAGE_TTL = 60 * 60 * 24;
const threed = await readFile('./src/3d.txt', 'utf-8');
const uf = new uFuzzy();

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

      // Check for bot authentication via Authorization header or botAuth query parameter
      let apiKey: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      } else if (botAuth) {
        apiKey = botAuth;
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

      const dbGrant = await prisma.channel.findFirst({
        where: { obsChatGrantToken: grant },
      });

      if (!chatUser && !dbGrant) {
        ws.close();
        return;
      }

      const { username } = c.req.param();
      if (dbGrant && dbGrant.name !== username) {
        ws.close();
        return;
      }

      ws.targetUsername = username;
      ws.chatUser = chatUser;
      ws.personalChannel = personalChannel;
      ws.viewerId = randomString(10);

      if (ws.raw) {
        ws.raw.targetUsername = username;
        ws.raw.chatUser = chatUser;
        ws.raw.personalChannel = personalChannel;
      }

      const channelKey = `chat:history:${username}`;
      const messages = await redis.zrange(channelKey, 0, MESSAGE_HISTORY_SIZE - 1);

      if (messages.length > 0) {
        ws.send(
          JSON.stringify({
            type: 'history',
            messages: messages.map((msg) => JSON.parse(msg)),
          })
        );
      }
    },
    async onClose(evt, ws) {
      // if prematurely exiting due to authentication issues
      console.log('client disconnected');
      if (!ws.targetUsername) return;

      const streamInfo = await prisma.streamInfo.findUnique({
        where: {
          username: ws.targetUsername,
        },
        select: {
          viewers: true,
        },
      });

      if (!streamInfo) return;

      await redis.del(`viewer:${ws.targetUsername}:${ws.viewerId}`);
    },
    async onMessage(evt, ws) {
      const msg = JSON.parse(evt.data.toString());

      if (msg.type === 'ping') {
        await redis.setex(`viewer:${ws.targetUsername}:${ws.viewerId}`, 30, '1');
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'message') {
        if (!ws.chatUser || !ws.personalChannel) return;

        const message = (msg.message as string).trim();
        const msgObj = {
          user: {
            id: ws.chatUser.id,
            username: ws.chatUser.username,
            pfpUrl: ws.chatUser.pfpUrl,
            displayName: ws.chatUser.displayName,
            isBot: ws.chatUser.isBot || false,
          },
          message,
        };

        const redisObj = {
          user: msgObj.user,
          message: msgObj.message,
          type: 'message',
        };

        const redisStr = JSON.stringify(redisObj);
        const msgStr = JSON.stringify(msgObj);

        const channelKey = `chat:history:${ws.targetUsername}`;
        await redis.zadd(channelKey, Date.now(), redisStr);
        await redis.zremrangebyrank(channelKey, 0, -MESSAGE_HISTORY_SIZE - 1);
        await redis.expire(channelKey, MESSAGE_TTL);

        ws.wss.clients.forEach((c) => {
          const client = c as ModifiedWebSocket;
          if (client.readyState === client.OPEN && client.targetUsername === ws.targetUsername) {
            c.send(msgStr);
          }
        });
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
