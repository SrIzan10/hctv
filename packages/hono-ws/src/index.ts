import type { Hono } from 'hono';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'node:http';
import type { Http2SecureServer, Http2Server } from 'node:http2';
import type { Duplex } from 'node:stream';
import type { Buffer } from 'node:buffer';
import type { Channel, User } from '@hctv/db';

/**
 * @link https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
 */
export const CloseEvent =
  globalThis.CloseEvent ??
  class extends Event {
    #eventInitDict;

    constructor(type: string, eventInitDict: CloseEventInit = {}) {
      super(type, eventInitDict);
      this.#eventInitDict = eventInitDict;
    }

    get wasClean(): boolean {
      return this.#eventInitDict.wasClean ?? false;
    }

    get code(): number {
      return this.#eventInitDict.code ?? 0;
    }

    get reason(): string {
      return this.#eventInitDict.reason ?? '';
    }
  };

/**
 * Create WebSockets for Node.js
 * @param init Options
 * @returns NodeWebSocket
 */
export const createNodeWebSocket = (init: NodeWebSocketInit): NodeWebSocket => {
  const wss = new WebSocketServer({ noServer: true });
  const waiterMap = new Map<
    IncomingMessage,
    { resolve: (ws: ModifiedWebSocket) => void; response: Response }
  >();

  wss.on('connection', (ws, request) => {
    const waiter = waiterMap.get(request);
    if (waiter) {
      waiter.resolve(ws);
      waiterMap.delete(request);
    }
  });

  const nodeUpgradeWebSocket = (request: IncomingMessage, response: Response) => {
    return new Promise<ModifiedWebSocket>((resolve) => {
      waiterMap.set(request, { resolve, response });
    });
  };

  return {
    injectWebSocket(server) {
      server.on('upgrade', async (request, socket: Duplex, head) => {
        const url = new URL(request.url ?? '/', init.baseUrl ?? 'http://localhost');
        const headers = new Headers();
        for (const key in request.headers) {
          const value = request.headers[key];
          if (!value) {
            continue;
          }
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }

        const response = await init.app.request(
          url,
          { headers: headers },
          { incoming: request, outgoing: undefined }
        );

        const waiter = waiterMap.get(request);
        if (!waiter || waiter.response !== response) {
          socket.end(
            'HTTP/1.1 400 Bad Request\r\n' +
              'Connection: close\r\n' +
              'Content-Length: 0\r\n' +
              '\r\n'
          );
          waiterMap.delete(request);
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      });
    },
    upgradeWebSocket: (createEvents) =>
      async function upgradeWebSocket(c, next) {
        if (c.req.header('upgrade')?.toLowerCase() !== 'websocket') {
          // Not websocket
          await next();
          return;
        }

        const response = new Response();
        (async () => {
          const ws = await nodeUpgradeWebSocket(c.env.incoming, response);
          const events = await createEvents(c);

          const ctx: ModifiedWSContext = {
            binaryType: 'arraybuffer',
            close(code, reason) {
              ws.close(code, reason);
            },
            protocol: ws.protocol,
            raw: ws,
            get readyState() {
              return ws.readyState;
            },
            send(source, opts) {
              ws.send(source, {
                compress: opts?.compress,
              });
            },
            url: new URL(c.req.url),
            wss,
          };
          events.onOpen?.(new Event('open'), ctx);
          ws.on('message', (data, isBinary) => {
            const datas = Array.isArray(data) ? data : [data];
            for (const data of datas) {
              events.onMessage?.(
                new MessageEvent('message', {
                  data: isBinary ? data : data.toString('utf-8'),
                }),
                ctx
              );
            }
          });
          ws.on('close', () => {
            events.onClose?.(new CloseEvent('close'), ctx);
          });
          ws.on('error', (error) => {
            events.onError?.(
              new ErrorEvent('error', {
                error: error,
              }),
              ctx
            );
          });
        })();

        return response;
      },
  };
};

// hono types file
import type { Context, MiddlewareHandler } from 'hono';
/**
 * WebSocket Event Listeners type
 */
export interface WSEvents {
  onOpen?: (evt: Event, ws: ModifiedWSContext) => void;
  onMessage?: (evt: MessageEvent<WSMessageReceive>, ws: ModifiedWSContext) => void;
  onClose?: (evt: CloseEvent, ws: ModifiedWSContext) => void;
  onError?: (evt: Event, ws: ModifiedWSContext) => void;
}
/**
 * Upgrade WebSocket Type
 */
export type UpgradeWebSocket<U = any, _WSEvents = WSEvents> = (
  createEvents: (c: Context) => _WSEvents | Promise<_WSEvents>,
  options?: U
) => MiddlewareHandler<
  any,
  string,
  {
    outputFormat: 'ws';
  }
>;
/**
 * ReadyState for WebSocket
 */
export type WSReadyState = 0 | 1 | 2 | 3;
/**
 * An argument for WSContext class
 */
export interface WSContextInit<T = unknown> {
  send(data: string | ArrayBuffer | Uint8Array, options: SendOptions): void;
  close(code?: number, reason?: string): void;
  raw?: T;
  readyState: WSReadyState;
  url?: string | URL | null;
  protocol?: string | null;
}
/**
 * Options for sending message
 */
export interface SendOptions {
  compress?: boolean;
}
/**
 * A context for controlling WebSockets
 */
export declare class WSContext<T = unknown> {
  constructor(init: WSContextInit<T>);
  send(source: string | ArrayBuffer | Uint8Array, options?: SendOptions): void;
  raw?: T;
  binaryType: BinaryType;
  get readyState(): WSReadyState;
  url: URL | null;
  protocol: string | null;
  close(code?: number, reason?: string): void;
}
export type WSMessageReceive = string | Blob | ArrayBufferLike | Buffer;
export declare const createWSMessageEvent: (
  source: WSMessageReceive
) => MessageEvent<WSMessageReceive>;
export interface WebSocketHelperDefineContext {}
export type WebSocketHelperDefineHandler<U> = (
  c: Context,
  events: WSEvents,
  options?: U
) => Promise<Response | void> | Response | void;
/**
 * Create a WebSocket adapter/helper
 */
export declare const defineWebSocketHelper: <T = unknown, U = any>(
  handler: WebSocketHelperDefineHandler<U>
) => UpgradeWebSocket<T, U>;

export interface NodeWebSocket {
  upgradeWebSocket: UpgradeWebSocket<ModifiedWebSocket>;
  injectWebSocket(server: Server | Http2Server | Http2SecureServer): void;
}

export interface NodeWebSocketInit {
  app: Hono<any, any, any>;
  baseUrl?: string | URL;
}

// Define the extended WebSocket context
interface ModifiedWSContext extends WSContext<ModifiedWebSocket> {
  wss: WebSocketServer;
  targetUsername?: string;
  user?: any;
  personalChannel?: any;
  viewerId?: string;
  botUsername?: string;
  chatUser?: ChatUser | null;
}

export interface ModifiedWebSocket extends WebSocket {
  targetUsername?: string;
  user?: User;
  personalChannel?: Channel;
  chatUser?: ChatUser | null;
}

interface CloseEventInit extends EventInit {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

interface ChatUser {
  id: string;
  username: string;
  pfpUrl: string;
  displayName?: string;
  isBot: boolean;
}