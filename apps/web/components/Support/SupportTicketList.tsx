'use client';

import { useCallback, useEffect, useState } from 'react';

import { getConversations } from '@/actions/support';
import { useTranslation } from '@/i18n/client';
import { Spinner } from '@heroui/react';
import { InboxIcon } from 'lucide-react';

interface Conversation {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  lastMessageContent: string | null;
  lastMessageAt: Date | null;
  lastMessageRole: string | null;
  hasUnreadReply: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SupportTicketListProps {
  onSelect: (id: string) => void;
}

const PAGE_SIZE = 20;

type TFunction = (key: string, options?: Record<string, unknown>) => string;

function formatRelativeTime(date: Date | string | null, t: TFunction): string {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('time.hoursAgo', { count: diffHour });
  if (diffDay < 30) return t('time.daysAgo', { count: diffDay });
  return d.toLocaleDateString();
}

export default function SupportTicketList({ onSelect }: SupportTicketListProps) {
  const { t } = useTranslation('support');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getConversations({ page: 1, pageSize: PAGE_SIZE });
      if (result.success && result.data) {
        const data = result.data as Conversation[];
        setConversations(data);
        setHasMore(data.length >= PAGE_SIZE);
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getConversations({ page: nextPage, pageSize: PAGE_SIZE });
      if (result.success && result.data) {
        const data = result.data as Conversation[];
        setConversations((prev) => [...prev, ...data]);
        setHasMore(data.length >= PAGE_SIZE);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Failed to load more conversations:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <InboxIcon className="mb-3 size-12 opacity-40" />
        <p className="text-sm">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {conversations.map((conv) => {
        const preview =
          conv.lastMessageRole === 'agent' || conv.lastMessageRole === 'ai'
            ? `${t('list.agentPrefix')}${conv.lastMessageContent || ''}`
            : conv.lastMessageContent || '';

        return (
          <button
            key={conv.id}
            type="button"
            className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-default-100"
            onClick={() => onSelect(conv.id)}>
            <div className="mt-2 flex-shrink-0">
              {conv.hasUnreadReply ? (
                <span className="block size-2 rounded-full bg-blue-500" />
              ) : (
                <span className="block size-2" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{conv.subject}</span>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(conv.lastMessageAt, t)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{preview}</p>
            </div>
          </button>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className="flex items-center justify-center py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={loadMore}
          disabled={loadingMore}>
          {loadingMore ? <Spinner size="sm" /> : t('list.loadMore')}
        </button>
      )}
    </div>
  );
}
