import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { ExternalLinkIcon, FileTextIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import {
  getDesktopBridge,
  useDesktopHistory,
  useIsDesktop,
  type PublishHistory,
} from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import {
  contentTypeLabels,
  DesktopPageShell,
  DesktopRequiredCard,
  EmptyState,
  formatDateTime,
  LoadingState,
  StatusChip,
} from './-components';

export const Route = createFileRoute('/dashboard/desktop/history')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop History | MultiPost',
      description: 'Review MultiPost Desktop publishing history.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopHistoryPage,
});

type StatusFilter = 'all' | PublishHistory['status'];

function DesktopHistoryPage() {
  const isDesktop = useIsDesktop();
  const { history, loading, refresh } = useDesktopHistory();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isDesktop) return <DesktopRequiredCard />;

  const filteredHistory = filter === 'all' ? history : history.filter((item) => item.status === filter);

  const openPost = (url: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      void bridge.app.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const deleteHistory = async (record: PublishHistory) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setDeletingId(record.id);
    try {
      await bridge.history.delete(record.id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DesktopPageShell
      title="Publish History"
      description="Review local Desktop publish results."
      actions={
        <Button
          variant="bordered"
          startContent={<RefreshCwIcon className="size-4" />}
          isLoading={loading}
          onPress={refresh}>
          Refresh
        </Button>
      }>
      <div className="flex flex-wrap gap-2">
        {(['all', 'success', 'failed', 'pending'] as StatusFilter[]).map((status) => (
          <Chip
            key={status}
            variant={filter === status ? 'solid' : 'bordered'}
            className="cursor-pointer"
            onClick={() => setFilter(status)}>
            {status} (
            {status === 'all'
              ? history.length
              : history.filter((record) => record.status === status).length}
            )
          </Chip>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          title="No publish history"
          description="Desktop publish results will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {filteredHistory.map((record) => (
            <Card
              key={record.id}
              className="shadow-none border">
              <CardBody className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Chip
                      size="sm"
                      variant="flat">
                      {contentTypeLabels[record.contentType]}
                    </Chip>
                    <StatusChip status={record.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(record.publishedAt)}
                    </span>
                  </div>
                  <h3 className="truncate font-medium">{record.title || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground">Platform: {record.platform}</p>
                  {record.errorMessage ? (
                    <p className="mt-1 line-clamp-2 text-sm text-danger">{record.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {record.platformPostUrl ? (
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      aria-label="Open published post"
                      onPress={() => openPost(record.platformPostUrl!)}>
                      <ExternalLinkIcon className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    aria-label="Delete history record"
                    isLoading={deletingId === record.id}
                    onPress={() => deleteHistory(record)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!loading && history.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileTextIcon className="size-4" />
          History is stored locally by the Desktop app.
        </p>
      ) : null}
    </DesktopPageShell>
  );
}
