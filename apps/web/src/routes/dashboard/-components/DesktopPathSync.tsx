import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

import { getDesktopBridge } from '@/lib/desktop-bridge';

export function DesktopPathSync() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.reportPath(pathname);
    }
  }, [pathname]);

  return null;
}
