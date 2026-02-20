import { z } from 'zod';

const disallowedUsernames = [
  'admin',
  'administrator',
  'settings',
  'create',
  // i hope this doesn't age well tbh
  'zrl',
];
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
  })
);

export const changeUsernameSchema = z.object({
  channelId: z.string().min(1),
  newUsername: username,
});
