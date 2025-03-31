'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import { checkServiceStatus } from '@/lib/extension';

const ForceInstallExtension = () => {
  const router = useRouter();

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
        router.push('/extension');
      }
    }

    checkExtension();

    return () => {
      isUnmounted = true;
    };
  }, [router]);

  return <div></div>;
};

export default ForceInstallExtension;
