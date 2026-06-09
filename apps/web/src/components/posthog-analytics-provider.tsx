import type { ReactNode } from 'react';

export function PostHogAnalyticsProvider({ children }: { children: ReactNode }) {
  // TODO(Phase 6): wire posthog-js and TanStack route-change tracking.
  return <>{children}</>;
}
