'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';

export async function authKey(request: Request) {
  const session = await auth();
  if (session?.user) {
    return {
      success: true,
      userId: session.user.id,
      email: session.user.email,
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }
  const apiKey = authHeader.split(' ')[1];
  if (!apiKey) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }

  const key = await multipostDb.aPIKey.findUnique({
    where: {
      key: apiKey,
    },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });
  if (!key) {
    return {
      success: false,
      error: 'KEY_EXPIRED',
    };
  }

  return {
    success: true,
    userId: key.userId,
    email: key.user.email,
  };
}
