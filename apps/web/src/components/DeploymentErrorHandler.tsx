'use client';

import { useEffect, useRef } from 'react';

/**
 * DeploymentErrorHandler - Handles errors caused by deployment version mismatches
 *
 * When a new version is deployed, old pages may contain stale Server Action IDs
 * or reference old JS chunks that no longer exist. This component detects these
 * errors and automatically reloads the page to fetch the latest version.
 *
 * Detected errors:
 * - UnrecognizedActionError: Server Action ID mismatch after deployment
 * - ChunkLoadError: JS chunk file not found (old build artifacts)
 */
export function DeploymentErrorHandler() {
  const hasReloaded = useRef(false);

  useEffect(() => {
    // Restore scroll position after reload
    const savedScroll = sessionStorage.getItem('deployment-error-scroll');
    if (savedScroll) {
      sessionStorage.removeItem('deployment-error-scroll');
      window.scrollTo(0, parseInt(savedScroll, 10));
    }

    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      if (hasReloaded.current) return;

      let errorName = '';
      let errorMessage = '';

      if (event instanceof ErrorEvent) {
        errorName = event.error?.name || '';
        errorMessage = event.message || event.error?.message || '';
      } else {
        // PromiseRejectionEvent
        const reason = event.reason;
        errorName = reason?.name || '';
        errorMessage = reason?.message || String(reason) || '';
      }

      // Detect Server Action errors
      const isServerActionError =
        errorName === 'UnrecognizedActionError' ||
        errorMessage.includes('Server Action') ||
        errorMessage.includes('was not found on the server');

      // Detect chunk loading errors. The extra patterns cover stale Vite
      // module hashes after a deploy: the import() call succeeds at the
      // network layer but the cached export shape has changed
      // ("does not provide an export named") or the module fails to evaluate
      // ("Importing a module script failed" / "Failed to fetch dynamically
      // imported module"). All three resolve once the user gets the new
      // client, so auto-reload is the correct UX.
      const isChunkLoadError =
        errorName === 'ChunkLoadError' ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('ChunkLoadError') ||
        errorMessage.includes('does not provide an export named') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('Failed to fetch dynamically imported module');

      if (isServerActionError || isChunkLoadError) {
        hasReloaded.current = true;

        // Save scroll position before reload
        const scrollPosition = window.scrollY;
        sessionStorage.setItem('deployment-error-scroll', String(scrollPosition));

        // Reload page to fetch latest version
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return null;
}
