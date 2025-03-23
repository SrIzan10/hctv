import { serve } from '@hono/node-server';
import { createNodeWebSocket, type ModifiedWebSocket } from '@hctv/hono-ws';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { lucia } from '@hctv/auth';
import { getCookie } from 'hono/cookie';
import { getPersonalChannel } from './utils/personalChannel.js';
import { prisma } from '@hctv/db';

const threed = await readFile('./src/3d.txt', 'utf-8');

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
      if (!token) {
        ws.close();
        return;
      }

      const { user } = await lucia.validateSession(token);
      if (!user) {
        ws.close();
        return;
      }

      const personalChannel = await getPersonalChannel(user.id);
      if (!personalChannel) {
        ws.close();
        return;
      }

      const { username } = c.req.param();
      ws.targetUsername = username;
      ws.user = user;
      ws.personalChannel = personalChannel;
      if (ws.raw) {
        ws.raw.targetUsername = username;
        // @ts-ignore
        ws.raw.user = user;
        ws.raw.personalChannel = personalChannel;
      }

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
    },
    async onClose(evt, ws) {
      console.log('client disconnected');
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
    onMessage(evt, ws) {
      const msg = evt.data.toString();
      ws.wss.clients.forEach((c) => {
        const client = c as ModifiedWebSocket;
        if (client.readyState === client.OPEN && client.targetUsername === ws.targetUsername) {
          c.send(
            JSON.stringify({
              user: {
                id: ws.user.id,
                username: ws.personalChannel.name,
                pfpUrl: ws.user.pfpUrl,
              },
              message: msg,
            })
          );
        }
      });
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
