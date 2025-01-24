'use server';

import { revalidatePath } from 'next/cache';
import { validateRequest } from '../auth';
import prisma from '../db';
import zodVerify from '../zodVerify';
import { streamInfoEditSchema } from './zod';

export async function editStreamInfo(prev: any, formData: FormData) {
  const { user } = await validateRequest();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  const zod = await zodVerify(streamInfoEditSchema, formData);
  if (!zod.success) {
    return zod;
  }

  await prisma.streamInfo.update({
    where: { username: user.username },
    data: zod.data,
  }).catch((e) => {
    console.error(e);
    return { success: false, error: 'Internal server error' };
  });

  revalidatePath(`/${user.username}`);

  return { success: true };
}
