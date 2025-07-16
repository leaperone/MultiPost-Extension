'use client';

import { addToast, Spinner } from '@heroui/react';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDynamicDraft, getDynamicDrafts, deleteDynamicDraft } from './actions';
import { DraftFileData, Draft } from './types';
import { DraftList } from './components/DraftList';
import { DraftEditor } from './components/DraftEditor';
import ClientPublishModal from './components/ClientPublishModal';

export default function DraftsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDraftId = searchParams.get('draftId');

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async (selectDraftId?: string) => {
    setLoading(true);
    try {
      const result = await getDynamicDrafts();
      if (result.success) {
        if (result.data) {
          setDrafts(
            result.data.map((d) => ({
              id: d.id,
              title: d.title ?? undefined,
              content: d.content ?? undefined,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
              files: (d.files as DraftFileData[]) || [],
            })),
          );
          if (selectDraftId) {
            router.push(`/dashboard/drafts?draftId=${selectDraftId}`);
          }
        }
      } else {
        addToast({
          title: result.error || 'Failed to load drafts',
          color: 'danger',
        });
      }
    } catch (error) {
      addToast({
        title: 'Failed to load drafts',
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    setCreating(true);
    try {
      const result = await createDynamicDraft();
      if (result.success) {
        if (result.data) {
          await loadDrafts(result.data.id);
        }
      } else {
        addToast({
          title: result.error || 'Failed to create draft',
          color: 'danger',
        });
      }
    } catch (error) {
      addToast({
        title: 'Failed to create draft',
        color: 'danger',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDraftUpdate = (updatedDraft: Draft) => {
    setDrafts((prevDrafts) => prevDrafts.map((d) => (d.id === updatedDraft.id ? { ...d, ...updatedDraft } : d)));
  };

  const handleSelectDraft = (draftId: string) => {
    router.push(`/dashboard/drafts?draftId=${draftId}`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const result = await deleteDynamicDraft(draftId);
      if (result.success) {
        setDrafts(drafts.filter((draft) => draft.id !== draftId));
        if (selectedDraftId === draftId) {
          router.push('/dashboard/drafts');
        }
        addToast({
          title: 'Draft deleted successfully',
          color: 'success',
        });
      } else {
        addToast({
          title: result.error || 'Failed to delete draft',
          color: 'danger',
        });
      }
    } catch (error) {
      addToast({
        title: 'Failed to delete draft',
        color: 'danger',
      });
    }
  };

  // Function to open publish modal - can be used by child components
  const handleOpenPublishModal = () => {
    setIsPublishModalOpen(true);
  };

  const handleClosePublishModal = () => {
    setIsPublishModalOpen(false);
  };

  const handlePublishSuccess = () => {
    addToast({
      title: 'Publish task created successfully',
      color: 'success',
    });
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-default-500">Loading drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
      <aside className="hidden min-h-0 border-r border-default-200 bg-default-100 md:block">
        <DraftList
          drafts={drafts}
          selectedDraftId={selectedDraftId}
          onSelectDraft={handleSelectDraft}
          onCreateDraft={handleCreateDraft}
          onDeleteDraft={handleDeleteDraft}
          isCreating={creating}
        />
      </aside>
      <main className="min-h-0 bg-white dark:bg-black">
        <DraftEditor
          draftId={selectedDraftId}
          onDraftUpdate={handleDraftUpdate}
          onOpenPublishModal={handleOpenPublishModal}
        />
      </main>

      {/* Publish Modal */}
      <ClientPublishModal
        isOpen={isPublishModalOpen}
        onClose={handleClosePublishModal}
        draftId={selectedDraftId || undefined}
        onSuccess={handlePublishSuccess}
      />
    </div>
  );
}
