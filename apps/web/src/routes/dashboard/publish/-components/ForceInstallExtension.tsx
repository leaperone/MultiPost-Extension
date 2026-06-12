import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { checkServiceStatus } from '@/lib/extension';

export default function ForceInstallExtension() {
  const navigate = useNavigate();

  useEffect(() => {
    let isUnmounted = false;

    async function checkExtension() {
      let retryCount = 0;
      while (retryCount < 2 && !isUnmounted) {
        const isServiceRunning = await checkServiceStatus(1000);
        if (isServiceRunning) {
          return;
        }
        retryCount++;
      }

      if (!isUnmounted) {
        void navigate({ to: '/extension' } as never);
      }
    }

    void checkExtension();

    return () => {
      isUnmounted = true;
    };
  }, [navigate]);

  return null;
}
