'use server';

import { cookies } from 'next/headers';
import { lucia, validateRequest } from '.';
import { redirect } from 'next/navigation';
import prisma from '../db';
import { generateId } from 'lucia';
import { accountSchema } from '../form/zod';
import { hash, verify } from '@node-rs/argon2';
import zodVerify from '../zodVerify';

export async function logout() {
  const { session } = await validateRequest();
  await lucia.invalidateSession(session!.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect('/auth/login');
}

export async function login(prev: any, data: FormData) {
  const zod = await zodVerify(accountSchema, data);
  if (!zod.success) return zod;
  const { username, password } = zod.data;

  const existingUser = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });
  if (!existingUser) {
    // NOTE:
    // Returning immediately allows malicious actors to figure out valid usernames from response times,
    // allowing them to only focus on guessing passwords in brute-force attacks.
    // As a preventive measure, you may want to hash passwords even for invalid usernames.
    // However, valid usernames can be already be revealed with the signup page among other methods.
    // It will also be much more resource intensive.
    // Since protecting against this is non-trivial,
    // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
    // If usernames are public, you may outright tell the user that the username is invalid.
    return {
      error: 'Incorrect username or password',
      success: false,
    };
  }

  const validPassword = await verify(existingUser.hashed_password, password);
  if (!validPassword) {
    return {
      error: 'Incorrect username or password',
      success: false,
    };
  }

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect('/');
}

export async function signup(prev: any, formData: FormData): Promise<ActionResult> {
  const zod = await zodVerify(accountSchema, formData);
  if (!zod.success) return zod;
  const { username, password } = zod.data;

  const hashedPassword = await hash(password);
  const userId = generateId(15);

  await prisma.user.create({
    data: {
      id: userId,
      username: username,
      hashed_password: hashedPassword,
    },
  });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect('/');
}

interface ActionResult {
  error: string | null;
  success: boolean | null;
}
