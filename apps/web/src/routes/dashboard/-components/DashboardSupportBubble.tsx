import { useCallback, useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';

import { getSupportBadgeInfo } from '../../../actions/support';
import { useTranslation } from '../../../i18n/client';

const POLL_INTERVAL = 30_000;

export default function DashboardSupportBubble() {
  const { t } = useTranslation('support');
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasActive, setHasActive] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBadge = useCallback(async () => {
    try {
      const info = await getSupportBadgeInfo();
      setUnread(info.unread);
      setHasActive(info.hasActive);
    } catch {
      setUnread(0);
      setHasActive(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    void fetchBadge();
    pollTimerRef.current = setInterval(fetchBadge, POLL_INTERVAL);
  }, [fetchBadge]);

  useEffect(() => {
    void fetchBadge();
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

  return (
    <>
      <button
        data-support-bubble
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-24 right-0 z-50 flex h-auto w-7 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-l-lg bg-foreground/30 py-2 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-foreground/80 hover:text-background"
        style={{ writingMode: 'vertical-rl' }}>
        <Headphones className="size-3.5 shrink-0" />
        <span className="text-xs leading-tight tracking-wide">{t('bubble.label')}</span>
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-80 rounded-xl border bg-background p-4 shadow-2xl">
          <div className="mb-2 text-sm font-medium">{t('home.title')}</div>
          <p className="mb-4 text-xs text-muted-foreground">{t('home.greetingHint')}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-default-100"
              onClick={() => setIsOpen(false)}>
              {t('modal.cancel')}
            </button>
            <a
              href="/docs/user-guide/contact-us"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">
              {t('home.newConversation')}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
