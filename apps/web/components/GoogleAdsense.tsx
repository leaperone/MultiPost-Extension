'use client';

import { useEffect } from 'react';

export function GoogleAdsense() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2175078350453165';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
