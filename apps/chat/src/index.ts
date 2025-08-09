import { serve } from '@hono/node-server';
import { createNodeWebSocket, type ModifiedWebSocket } from '@hctv/hono-ws';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { lucia } from '@hctv/auth';
import { getCookie } from 'hono/cookie';
import { getPersonalChannel } from './utils/personalChannel.js';
import { getRedisConnection, prisma, type User } from '@hctv/db';
import uFuzzy from '@leeoniya/ufuzzy';

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
    // https://hono.dev/helpers/websocket
    async onOpen(evt, ws) {
      const token = getCookie(c, 'auth_session');
      const grant = c.req.query('grant');
      console.log({
        token,
        grant,
      })
      if (!token && !grant) {
        console.log('closing a')
        ws.close();
        return;
      }
      // but if there is actually a token with no grant, we let it pass through
      if (!token && grant === 'null') {
        console.log('closing b')
        ws.close();
        return;
      }

      let user: User | null = null
      const dbGrant = await prisma.channel.findFirst({
        where: {
          obsChatGrantToken: grant,
        }
      });
      if (token) {
        user = (await lucia.validateSession(token)).user;
        const personalChannel = await getPersonalChannel(user!.id);
        if (!personalChannel) {
          ws.close();
          return;
        }
        ws.personalChannel = personalChannel;
      }
      if (!user && !dbGrant) {
        ws.close();
        return;
      }

      // ignoring user here which might be undefined so

      const { username } = c.req.param();
      ws.targetUsername = username;
      ws.user = user;
      if (ws.raw) {
        ws.raw.targetUsername = username;
        // @ts-ignore
        ws.raw.user = user;
        ws.raw.personalChannel = ws.personalChannel;
      }

      const redis = getRedisConnection();
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
      if (token && grant === 'null') {
        await prisma.streamInfo.update({
          where: {
            username,
          },
          data: {
            viewers: {
              increment: 1,
            },
          },
        });
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

      await prisma.streamInfo.update({
        where: {
          username: ws.targetUsername,
        },
        data: {
          viewers: streamInfo.viewers === 0 ? { set: 0 } : { decrement: 1 },
        },
      });
    },
    async onMessage(evt, ws) {
      const msg = JSON.parse(evt.data.toString());
      if (msg.type === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
          })
        );
        return;
      }
      if (msg.type === 'message') {
        if (!ws.personalChannel) return;
        const message = (msg.message as string).trim();
        const msgObj = {
          user: {
            id: ws.user.id,
            username: ws.personalChannel.name,
            pfpUrl: ws.user.pfpUrl,
          },
          message,
        };
        
        // Save to Redis without the type field to maintain compatibility
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
