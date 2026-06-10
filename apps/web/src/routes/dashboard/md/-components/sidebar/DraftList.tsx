'use client';

import { Card, CardBody, Button, cn, Tooltip } from '@heroui/react';
import { TrashIcon, FileTextIcon, Plus } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { useMdDraftStore } from '@/store/md-draft.store';
import { useState } from 'react';

export default function DraftList() {
  const { t } = useTranslation('draft');
  const drafts = useMdDraftStore((s) => s.drafts);
  const activeDraftId = useMdDraftStore((s) => s.activeDraftId);
  const switchDraft = useMdDraftStore((s) => s.switchDraft);
  const deleteDraft = useMdDraftStore((s) => s.deleteDraft);
  const createDraft = useMdDraftStore((s) => s.createDraft);
  const [creating, setCreating] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createDraft();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-3">
        <Button
          size="sm"
          variant="flat"
          fullWidth
          startContent={<Plus className="size-4" />}
          onPress={handleCreate}
          isLoading={creating}>
          {t('newDraft')}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 && !creating ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <FileTextIcon className="mx-auto mb-4 size-16 text-default-300" />
              <h3 className="mb-2 text-lg font-semibold">{t('list.emptyState.title')}</h3>
              <p className="text-sm text-default-500">{t('list.emptyState.description')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 px-3 pb-3">
            {drafts.map((draft) => {
              const getTitleText = () => {
                if (draft.title && draft.title.trim()) {
                  return draft.title.trim();
                }
                if (draft.content && draft.content.trim()) {
                  const plainText = draft.content
                    .trim()
                    .replace(/[#*`\[\]]/g, '')
                    .replace(/\n+/g, ' ');
                  return plainText;
                }
                return t('list.untitledDraft');
              };

              const fullText = getTitleText();
              const maxLength = 30;
              const displayTitle = fullText.length > maxLength ? fullText.substring(0, maxLength) + '...' : fullText;

              return (
                <Card
                  key={draft.id}
                  isPressable
                  onPress={() => switchDraft(draft.id)}
                  className={cn(
                    'w-full border shadow-none transition-all',
                    activeDraftId === draft.id
                      ? 'border-primary bg-primary/10'
                      : 'bg-default-50 hover:bg-default-100',
                  )}>
                  <CardBody className="group p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Tooltip
                          content={fullText}
                          isDisabled={fullText.length <= maxLength}
                          placement="top"
                          delay={500}>
                          <h3 className="line-clamp-2 font-semibold leading-tight">{displayTitle}</h3>
                        </Tooltip>
                        <p className="text-sm text-default-500">{formatDate(draft.updatedAt)}</p>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onPress={() => deleteDraft(draft.id)}>
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
