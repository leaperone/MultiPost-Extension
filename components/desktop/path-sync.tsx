'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getDesktopBridge } from '@/lib/desktop-bridge';

export function DesktopPathSync() {
  const pathname = usePathname();

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.reportPath(pathname);
    }
  }, [pathname]);

  return null;
}
