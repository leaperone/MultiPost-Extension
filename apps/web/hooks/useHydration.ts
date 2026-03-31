'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to track hydration state for SSR/CSR consistency
 * Use this to prevent hydration mismatches when accessing browser APIs
 * or Zustand persisted stores
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Hook that returns the store value only after hydration
 * During SSR and initial client render, returns the fallback value
 * After hydration, returns the actual store value
 *
 * @param useStore - Zustand store hook
 * @param selector - Selector function to pick specific state
 * @param fallback - Fallback value to use during SSR/initial render
 */
export function useStoreHydration<T, S>(
  useStore: () => T,
  selector: (state: T) => S,
  fallback: S,
): S {
  const isHydrated = useHydration();
  const storeValue = useStore();

  if (!isHydrated) {
    return fallback;
  }

  return selector(storeValue);
}
