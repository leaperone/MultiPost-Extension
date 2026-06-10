import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { EditIcon, FileTextIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import {
  getDesktopBridge,
  useDesktopDrafts,
  useIsDesktop,
  type ContentType,
  type Draft,
} from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import {
  contentTypeLabels,
  DesktopPageShell,
  DesktopRequiredCard,
  EmptyState,
  formatDateTime,
  LoadingState,
  publishPathByContentType,
} from './-components';

export const Route = createFileRoute('/dashboard/desktop/drafts')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Drafts | MultiPost',
      description: 'Manage MultiPost Desktop drafts.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopDraftsPage,
});

function DesktopDraftsPage() {
  const isDesktop = useIsDesktop();
  const { drafts, loading, refresh } = useDesktopDrafts();
  const [filter, setFilter] = useState<ContentType | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isDesktop) return <DesktopRequiredCard />;

  const filteredDrafts =
    filter === 'all' ? drafts : drafts.filter((draft) => draft.contentType === filter);

  const navigateToDraft = (draft: Draft) => {
    getDesktopBridge()?.navigation.navigateTo(
      `${publishPathByContentType[draft.contentType]}?draft=${encodeURIComponent(draft.id)}`,
    );
  };

  const deleteDraft = async (draft: Draft) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setDeletingId(draft.id);
    try {
      await bridge.draft.delete(draft.id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DesktopPageShell
      title="Drafts"
      description="Manage local Desktop drafts."
      actions={
        <Button
          color="primary"
          startContent={<PlusIcon className="size-4" />}
          onPress={() => getDesktopBridge()?.navigation.navigateTo('/dashboard/desktop/publish/dynamic')}>
          New draft
        </Button>
      }>
      <div className="flex flex-wrap gap-2">
        <Chip
          variant={filter === 'all' ? 'solid' : 'bordered'}
          className="cursor-pointer"
          onClick={() => setFilter('all')}>
          All ({drafts.length})
        </Chip>
        {(Object.keys(contentTypeLabels) as ContentType[]).map((type) => {
          const count = drafts.filter((draft) => draft.contentType === type).length;
          return (
            <Chip
              key={type}
              variant={filter === type ? 'solid' : 'bordered'}
              className="cursor-pointer"
              onClick={() => setFilter(type)}>
              {contentTypeLabels[type]} ({count})
            </Chip>
          );
        })}
      </div>

      {loading ? (
        <LoadingState />
      ) : filteredDrafts.length === 0 ? (
        <EmptyState
          title="No drafts"
          description="Create a new Desktop draft from a publish page."
        />
      ) : (
        <div className="grid gap-3">
          {filteredDrafts.map((draft) => (
            <Card
              key={draft.id}
              className="shadow-none border">
              <CardBody className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Chip
                      size="sm"
                      variant="flat">
                      {contentTypeLabels[draft.contentType]}
                    </Chip>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(draft.updatedAt)}
                    </span>
                  </div>
                  <h3 className="truncate font-medium">{draft.title || 'Untitled'}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {draft.content || 'No content'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    aria-label="Edit draft"
                    onPress={() => navigateToDraft(draft)}>
                    <EditIcon className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    aria-label="Delete draft"
                    isLoading={deletingId === draft.id}
                    onPress={() => deleteDraft(draft)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!loading && drafts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileTextIcon className="size-4" />
          Drafts are stored locally by the Desktop app.
        </p>
      ) : null}
    </DesktopPageShell>
  );
}
