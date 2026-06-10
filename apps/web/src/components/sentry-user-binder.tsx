import * as Sentry from '@sentry/react';
import { useEffect, useRef } from 'react';

import { useSession } from '../lib/auth-client';

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
          ...(session?.user?.name ? { username: session.user.name } : {}),
        });
      }
    });
  }, [session?.user?.id, session?.user?.name, status]);

  return null;
}
