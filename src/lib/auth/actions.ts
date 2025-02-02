'use server';

import { cookies } from 'next/headers';
import { lucia, validateRequest } from '.';
import { redirect } from 'next/navigation';

export async function logout() {
  const { session } = await validateRequest();
  await lucia.invalidateSession(session!.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect('/auth/login');
}
