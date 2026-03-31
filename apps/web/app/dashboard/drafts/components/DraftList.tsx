'use client';

import { Card, CardBody, Button, cn, Tooltip } from '@heroui/react';
import { TrashIcon, FileTextIcon } from 'lucide-react';
import { useTranslation } from '@/i18n/client';
import { Draft } from '../types';

export function DraftList({
  drafts,
  selectedDraftId,
  onSelectDraft,
  onDeleteDraft,
  isCreating,
}: {
  drafts: Draft[];
  selectedDraftId: string | null;
  onSelectDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  isCreating: boolean;
}) {
  const { t } = useTranslation('draft');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 && !isCreating ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <FileTextIcon className="mx-auto mb-4 size-16 text-default-300" />
              <h3 className="mb-2 text-lg font-semibold">{t('list.emptyState.title')}</h3>
              <p className="text-sm text-default-500">{t('list.emptyState.description')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {drafts.map((draft) => {
              // Get display text: title first, then content, finally fallback
              const getTitleText = () => {
                if (draft.title && draft.title.trim()) {
                  return draft.title.trim();
                }
                if (draft.content && draft.content.trim()) {
                  // Remove markdown syntax and get plain text
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
                  onPress={() => onSelectDraft(draft.id)}
                  className={cn(
                    'w-full border shadow-none transition-all',
                    selectedDraftId === draft.id
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
                        onPress={() => {
                          onDeleteDraft(draft.id);
                        }}>
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
