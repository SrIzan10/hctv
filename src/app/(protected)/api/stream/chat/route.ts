import { lucia } from '@/lib/auth';
import { resolveUserPersonalChannel } from '@/lib/db/resolve';

export async function SOCKET(
  client: import('ws').WebSocket,
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

  client.on('message', (message) => {
    const msg = message.toString();
    server.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(
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
            client.send(JSON.stringify({
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
}

function parseCookieString(cookie: string) {
  return cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    acc[key.trim()] = value;
    return acc;
  }, {} as Record<string, string>);
}
