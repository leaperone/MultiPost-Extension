'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkServiceStatus } from '@/lib/extension';

type ExtensionStatus = 'loading' | 'installed' | 'not_installed';

interface UseExtensionStatusOptions {
  /** Timeout in ms for each check attempt */
  timeout?: number;
  /** Number of retry attempts before declaring not installed */
  retryCount?: number;
  /** Whether to start checking immediately */
  autoCheck?: boolean;
  /** Interval in ms for polling when not installed */
  pollInterval?: number;
}

interface UseExtensionStatusReturn {
  status: ExtensionStatus;
  isLoading: boolean;
  isInstalled: boolean;
  recheck: () => Promise<void>;
}

/**
 * Hook to detect browser extension installation status
 * Provides loading, installed, and not_installed states with auto-polling
 */
export function useExtensionStatus(options: UseExtensionStatusOptions = {}): UseExtensionStatusReturn {
  const { timeout = 1500, retryCount = 2, autoCheck = true, pollInterval = 3000 } = options;

  const [status, setStatus] = useState<ExtensionStatus>('loading');

  const checkExtension = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < retryCount; attempt++) {
      const isRunning = await checkServiceStatus(timeout);
      if (isRunning) {
        return true;
      }
    }
    return false;
  }, [timeout, retryCount]);

  const recheck = useCallback(async () => {
    setStatus('loading');
    const isInstalled = await checkExtension();
    setStatus(isInstalled ? 'installed' : 'not_installed');
  }, [checkExtension]);

  useEffect(() => {
    if (!autoCheck) return;

    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const doCheck = async () => {
      const isInstalled = await checkExtension();
      if (!isMounted) return;

      if (isInstalled) {
        setStatus('installed');
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      } else {
        setStatus('not_installed');
        // Start polling when not installed
        if (!pollTimer && pollInterval > 0) {
          pollTimer = setInterval(async () => {
            const installed = await checkExtension();
            if (installed && isMounted) {
              setStatus('installed');
              if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
            }
          }, pollInterval);
        }
      }
    };

    doCheck();

    return () => {
      isMounted = false;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [autoCheck, checkExtension, pollInterval]);

  return {
    status,
    isLoading: status === 'loading',
    isInstalled: status === 'installed',
    recheck,
  };
}
