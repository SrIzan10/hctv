import { lucia } from '@/lib/auth';
import prisma from '@/lib/db';
import { resolveUserPersonalChannel } from '@/lib/db/resolve';
import type { WebSocket } from 'ws';

export async function SOCKET(
  client: ExtendedWebSocket,
  request: import('http').IncomingMessage,
  server: import('ws').WebSocketServer
) {
  const cookies = parseCookieString(request.headers.cookie!);
  const { user } = await lucia.validateSession(cookies.auth_session);
  if (!user) {
    client.close();
    return;
  }

  const personalChannel = await resolveUserPersonalChannel(user.id);
  if (!personalChannel) {
    client.close();
    return;
  }

  const url = new URL(request.url!, `http://${request.headers.host}`);
  const username = url.pathname.split('/').at(-1);
  client.targetUsername = username!;

  client.on('message', (message) => {
    const msg = message.toString();
    server.clients.forEach((c) => {
      const client = c as ExtendedWebSocket;
      if (client.readyState === client.OPEN && client.targetUsername === username) {
        c.send(
          JSON.stringify({
            user: {
              id: user.id,
              username: personalChannel.name,
              pfpUrl: user.pfpUrl,
            },
            message: msg,
          })
        );
        /* if (msg === 'BOMB') {
          for (let i = 0; i < 10000; i++) {
            c.send(JSON.stringify({
              user: {
                id: user.id,
                username: personalChannel.name,
                pfpUrl: user.pfpUrl,
              },
              message: 'HIIIII',
            }));
          }
        } */
      }
    });
  });

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

  client.on('close', async () => {
    console.log('client disconnected');
    const { viewers } = (await prisma.streamInfo.findUnique({
      where: {
        username,
      },
      select: {
        viewers: true,
      },
    }))!;
    await prisma.streamInfo.update({
      where: {
        username,
      },
      data: {
        viewers: {
          decrement: viewers > 0 ? 1 : 0,
          set: viewers === 0 ? 0 : undefined,
        },
      },
    });
  });
}

function parseCookieString(cookie: string) {
  return cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    acc[key.trim()] = value;
    return acc;
  }, {} as Record<string, string>);
}

interface ExtendedWebSocket extends WebSocket {
  targetUsername: string;
}
