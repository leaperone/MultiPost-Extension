'use client';

import { Card, CardBody, Button, cn } from '@heroui/react';
import { PlusIcon, TrashIcon, FileTextIcon } from 'lucide-react';
import { Draft } from '../types';

export function DraftList({
  drafts,
  selectedDraftId,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
  isCreating,
}: {
  drafts: Draft[];
  selectedDraftId: string | null;
  onSelectDraft: (id: string) => void;
  onCreateDraft: () => void;
  onDeleteDraft: (id: string) => void;
  isCreating: boolean;
}) {
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
      <div className="p-4">
        <Button
          color="primary"
          startContent={<PlusIcon className="size-4" />}
          onPress={onCreateDraft}
          isLoading={isCreating}
          className="w-full">
          New Draft
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length === 0 && !isCreating ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <FileTextIcon className="mx-auto mb-4 size-16 text-default-300" />
              <h3 className="mb-2 text-lg font-semibold">No drafts yet</h3>
              <p className="text-sm text-default-500">Create your first draft.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                isPressable
                onPress={() => onSelectDraft(draft.id)}
                className={cn(
                  'w-full border shadow-none transition-all',
                  selectedDraftId === draft.id ? 'border-primary bg-primary/10' : 'bg-default-50 hover:bg-default-100',
                )}>
                <CardBody className="group p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="truncate font-semibold">{draft.title || 'Untitled Draft'}</h3>
                      <p className="text-sm text-default-500">{formatDate(draft.updatedAt)}</p>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onPress={() => {
                        onDeleteDraft(draft.id);
                      }}>
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
