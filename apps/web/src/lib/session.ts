import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from './auth';

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AppSession = NonNullable<BetterAuthSession> & {
  expires?: string;
  user: NonNullable<BetterAuthSession>['user'] & {
    id: string;
    email: string;
    name: string;
  };
};

function toAppSession(session: BetterAuthSession): AppSession | null {
  if (!session?.user?.id) {
    return null;
  }

  return {
    ...session,
    expires: session.session.expiresAt.toISOString(),
    user: {
      ...session.user,
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

/**
 * Better Auth facade for the old NextAuth auth() return shape.
 * Callers can keep reading session.user.id, session.user.email, and session.user.name.
 */
export async function getSessionFromRequest(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return toAppSession(session);
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  return toAppSession(session);
}
