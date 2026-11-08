import { z } from 'zod';
import {
  MULTISTREAM_PLATFORMS,
  MULTISTREAM_PLATFORM_META,
  MULTISTREAM_SCHEMES,
  getUrlScheme,
} from '../utils/multistream';

const disallowedUsernames = ['admin', 'administrator', 'settings', 'create'];
const username = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-z0-9_-]+$/, { message: 'Only characters from a-z, 0-9, underscores and dashes' })
  .refine((val) => !disallowedUsernames.includes(val.toLowerCase()), {
    message: 'This username is reserved',
  });

export const streamInfoEditSchema = z.object({
  username: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
});

export const onboardSchema = z.object({
  userId: z.string().min(1),
  username: username,
});

export const createChannelSchema = z.object({
  name: username,
});

export const updateChannelSettingsSchema = z.object({
  channelId: z.string().min(1),
  pfpUrl: z.string(),
  description: z.string().min(1).max(500),
  is247: z.boolean(),
});

export const updateChatModerationSchema = z.object({
  channelId: z.string().min(1),
  blockedTerms: z.string().max(5000).optional(),
  slowModeSeconds: z.coerce.number().int().min(0).max(120),
  maxMessageLength: z.coerce.number().int().min(50).max(2000),
  rateLimitCount: z.coerce.number().int().min(3).max(30),
  rateLimitWindowSeconds: z.coerce.number().int().min(5).max(60),
});

export const createBotSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  slug: username.refine((val) => val !== 'settings', { message: 'This slug is reserved' }),
  description: z.string().max(300).optional(),
});

export const editBotSchema = createBotSchema.and(
  z.object({
    from: z.string().min(1),
    pfpUrl: z.string(),
  })
);

export const changeUsernameSchema = z.object({
  channelId: z.string().min(1),
  newUsername: username,
});

const notificationChannelsSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => {
    if (typeof value === 'string') {
      return value
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((channel) => channel.trim())
        .filter(Boolean);
    }

    return value.map((channel) => channel.trim()).filter(Boolean);
  })
  .pipe(z.array(z.string()).max(10));

export const updateNotificationChannelsSchema = z.object({
  channelId: z.string().min(1),
  channels: notificationChannelsSchema,
});

// hostnames the media server could reach but the internet can't: loopback, private ranges and
// bare docker service names like `mediamtx` or `redis`
function isPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes('.') && !host.includes(':')) return false;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return false;
  }
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return false;
  }
  return true;
}

const multistreamServerUrl = z
  .string()
  .trim()
  .min(1, { message: 'Server URL is required' })
  .max(512)
  .refine((value) => MULTISTREAM_SCHEMES.includes(getUrlScheme(value) ?? ''), {
    message: `Use one of ${MULTISTREAM_SCHEMES.map((s) => `${s}://`).join(', ')}`,
  })
  .refine(
    (value) => {
      try {
        // URL() doesn't know rtmp, so parse it as http to read the hostname
        return isPublicHost(new URL(value.replace(/^[a-z0-9+.-]+:\/\//i, 'http://')).hostname);
      } catch {
        return false;
      }
    },
    { message: 'Server URL must point to a public host' }
  );

const multistreamDestinationFields = {
  platform: z.enum(MULTISTREAM_PLATFORMS),
  name: z.string().trim().min(1, { message: 'Name is required' }).max(50),
  serverUrl: multistreamServerUrl,
  streamKey: z.string().trim().max(512).default(''),
};

export const addMultistreamDestinationSchema = z
  .object({ channelId: z.string().min(1), ...multistreamDestinationFields })
  .refine(
    (data) => !MULTISTREAM_PLATFORM_META[data.platform].isKeyRequired || data.streamKey.length > 0,
    { message: 'Stream key is required', path: ['streamKey'] }
  );

export const updateMultistreamDestinationSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  name: multistreamDestinationFields.name.optional(),
  serverUrl: multistreamServerUrl.optional(),
  // empty keeps the saved key; the browser only ever sees a masked one
  streamKey: z.string().trim().max(512).optional(),
});

export const removeMultistreamDestinationSchema = z.object({
  id: z.string().min(1),
});
