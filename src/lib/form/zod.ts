import { z } from 'zod';

const username = z
  .string()
  .min(1)
  .regex(/^[a-z0-9_-]+$/, { message: 'Only characters from a-z, 0-9, underscores and dashes' });

export const streamInfoEditSchema = z.object({
  username: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
});

export const onboardSchema = z.object({
  userId: z.string().min(1),
  username: username,
});
