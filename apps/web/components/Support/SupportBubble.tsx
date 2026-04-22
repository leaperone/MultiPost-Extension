'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { getSupportBadgeInfo } from '@/actions/support';
import { useTranslation } from '@/i18n/client';
import SupportPanel from './SupportPanel';

const POLL_INTERVAL = 30_000;

export default function SupportBubble() {
  const { t } = useTranslation('support');
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasActive, setHasActive] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Polling ---

  const fetchBadge = useCallback(async () => {
    try {
      const info = await getSupportBadgeInfo();
      setUnread(info.unread);
      setHasActive(info.hasActive);
    } catch {
      // silently ignore
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    fetchBadge();
    pollTimerRef.current = setInterval(fetchBadge, POLL_INTERVAL);
  }, [fetchBadge]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Start/stop polling based on hasActive and visibility
  useEffect(() => {
    // Initial fetch
    fetchBadge();
  }, [fetchBadge]);

  useEffect(() => {
    if (!hasActive) {
      stopPolling();
      return;
    }

    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasActive, startPolling, stopPolling]);

  // --- Screenshot on open ---

  const captureScreenshot = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(document.body, {
        ignoreElements: (el) =>
          el.hasAttribute('data-support-bubble') || el.hasAttribute('data-support-panel'),
        useCORS: true,
        logging: false,
      });

      const MAX_WIDTH = 1280;
      let srcCanvas: HTMLCanvasElement = canvas;
      if (canvas.width > MAX_WIDTH) {
        const scale = MAX_WIDTH / canvas.width;
        const scaled = document.createElement('canvas');
        scaled.width = MAX_WIDTH;
        scaled.height = Math.round(canvas.height * scale);
        const ctx = scaled.getContext('2d');
        ctx?.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        srcCanvas = scaled;
      }

      let quality = 0.7;
      let dataUrl = srcCanvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length > 500_000) {
        quality = 0.4;
        dataUrl = srcCanvas.toDataURL('image/jpeg', quality);
      }

      return dataUrl;
    } catch (error) {
      console.error('Support screenshot capture failed:', error);
      return null;
    }
  }, []);

  const handleOpen = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const shot = await captureScreenshot();
    setScreenshot(shot);
    setIsOpen(true);
  }, [isOpen, captureScreenshot]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Refresh badge when closing, in case user read messages
    fetchBadge();
  }, [fetchBadge]);

  return (
    <>
      {/* Side-tab button */}
      <button
        data-support-bubble
        onClick={handleOpen}
        className="fixed right-0 bottom-24 z-50 flex h-auto w-7 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-l-lg bg-foreground/30 py-2 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-foreground/80 hover:text-background"
        style={{ writingMode: 'vertical-rl' }}
      >
        <Headphones className="size-3.5 shrink-0" />
        <span className="text-xs leading-tight tracking-wide">{t('bubble.label')}</span>

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Support Panel */}
      {isOpen && (
        <div data-support-panel>
          <SupportPanel screenshot={screenshot} onClose={handleClose} />
        </div>
      )}
    </>
  );
}
