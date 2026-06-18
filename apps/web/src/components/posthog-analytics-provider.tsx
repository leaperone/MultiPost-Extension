import { useLocation } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

import { useSession } from '../lib/auth-client';
import { isPostHogClientEnabled, POSTHOG_HOST, POSTHOG_KEY } from '../lib/posthog/client-config';

let hasInitialized = false;

const ensurePostHog = () => {
  if (!isPostHogClientEnabled() || hasInitialized || typeof window === 'undefined') {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    person_profiles: 'identified_only',
    defaults: '2025-05-24',
    capture_exceptions: true,
    debug: false,
  });

  hasInitialized = true;
};

function PostHogAnalyticsInner() {
  const location = useLocation();
  const { data: session, status } = useSession();
  const lastUrlRef = useRef<string | null>(null);
  const locationKey = `${location.pathname}${location.searchStr}`;

  useEffect(() => {
    if (!isPostHogClientEnabled() || typeof window === 'undefined') {
      return;
    }

    const currentUrl = window.location.href;

    if (!lastUrlRef.current) {
      lastUrlRef.current = currentUrl;
      return;
    }

    const previousUrl = lastUrlRef.current;

    if (previousUrl !== currentUrl) {
      posthog.capture('$pageleave', {
        $current_url: previousUrl,
        $next_url: currentUrl,
        $pageleave_reason: 'spa-route-change',
      });
      lastUrlRef.current = currentUrl;
    }
  }, [locationKey]);

  useEffect(() => {
    if (!isPostHogClientEnabled() || typeof window === 'undefined') {
      return;
    }

    const eventName = ('onpagehide' in window ? 'pagehide' : 'unload') as 'pagehide' | 'unload';

    const handlePageHide = () => {
      const url = lastUrlRef.current ?? window.location.href;

      posthog.capture(
        '$pageleave',
        {
          $current_url: url,
          $pageleave_reason: eventName,
        },
        { transport: 'sendBeacon' },
      );
    };

    window.addEventListener(eventName, handlePageHide);

    return () => {
      window.removeEventListener(eventName, handlePageHide);
    };
  }, []);

  useEffect(() => {
    if (!isPostHogClientEnabled() || typeof window === 'undefined') {
      return;
    }

    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [locationKey]);

  useEffect(() => {
    if (!isPostHogClientEnabled() || typeof window === 'undefined' || status === 'loading') {
      return;
    }

    const userId = session?.user?.id?.trim();
    const username = session?.user?.name;

    if (userId) {
      posthog.identify(userId, {
        username,
      });
    } else {
      posthog.reset();
    }
  }, [session?.user?.id, session?.user?.name, status]);

  return null;
}

function PostHogAnalyticsRuntime() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isPostHogClientEnabled()) {
      return;
    }

    ensurePostHog();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return <PostHogAnalyticsInner />;
}

export function PostHogAnalyticsProvider({ children }: { children: ReactNode }) {
  if (!isPostHogClientEnabled()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogAnalyticsRuntime />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
