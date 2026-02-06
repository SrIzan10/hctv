'use server';

import { cookies } from 'next/headers';
import { lucia } from '@hctv/auth';
import { validateRequest } from '@/lib/auth/validate';
import { redirect } from 'next/navigation';
import { getRedisConnection } from '@hctv/db';

export async function logout() {
  const { session } = await validateRequest();
  await getRedisConnection().del(`sessions:${session!.id}`);
  await lucia.invalidateSession(session!.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect('/');
}
