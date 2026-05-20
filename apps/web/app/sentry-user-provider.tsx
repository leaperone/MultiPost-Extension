'use client';

import * as Sentry from '@sentry/nextjs';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

export function SentryUserBinder() {
  const { data: session, status } = useSession();
  const epochRef = useRef(0);

  useEffect(() => {
    if (status === 'loading') return;
    const epoch = ++epochRef.current;
    const userId = session?.user?.id?.trim();

    if (!userId) {
      Sentry.setUser(null);
      return;
    }

    Promise.resolve().then(() => {
      if (epoch === epochRef.current) {
        Sentry.setUser({
          id: userId,
          ...(session?.user?.username ? { username: session.user.username } : {}),
        });
      }
    });
  }, [session?.user?.id, session?.user?.username, status]);

  return null;
}
