import { useEffect, useRef } from 'react';

import { useSession } from '../lib/auth-client';

export function SentryUserBinder() {
  const { data: session, status } = useSession();
  const epochRef = useRef(0);

  useEffect(() => {
    if (status === 'loading') return;
    const epoch = ++epochRef.current;
    const userId = session?.user?.id?.trim();

    // Dynamic import keeps @sentry/core out of the entry chunk; the epoch guard
    // drops stale updates that resolve after a newer session change.
    void import('@sentry/core').then(({ setUser }) => {
      if (epoch !== epochRef.current) return;

      if (!userId) {
        setUser(null);
        return;
      }

      setUser({
        id: userId,
        ...(session?.user?.name ? { username: session.user.name } : {}),
      });
    });
  }, [session?.user?.id, session?.user?.name, status]);

  return null;
}
