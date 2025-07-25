'use client';

import { addToast, Spinner, Button, Tabs, Tab } from '@heroui/react';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Send, Plus, Zap, FileText, Image, Sparkles, BotIcon } from 'lucide-react';
import {
  createDynamicDraft,
  getDynamicDrafts,
  deleteDynamicDraft,
  getDynamicDraft,
  updateDynamicDraft,
} from './actions';
import { DraftFileData, DraftFileDataClient, Draft } from './types';
import { DraftList } from './components/DraftList';
import { DraftEditor } from './components/DraftEditor';
import MediaLibrary from './components/MediaLibrary';
import ClientPublishModal from './components/ClientPublishModal';
import DirectPublishModal from './components/DriectPublishModal';
import { ChatCreationPanel } from './components/ChatCreationPanel';
import { ImageGeneratePanel } from './components/ImageGeneratePanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useTranslation } from '@/i18n/client';
import { nanoid } from 'nanoid';
import { useDraftStore } from '@/store/draft.store';
import { PosterGeneratePanel } from './components/PosterGeneratePanel';

export default function DraftsPage() {
  const { t } = useTranslation('draft');
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDraftId = searchParams.get('draftId');

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDirectPublishModalOpen, setIsDirectPublishModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const { lastActiveTab, setLastActiveTab, lastSelectedDraftId, setLastSelectedDraftId } = useDraftStore();
  const [activeTab, setActiveTab] = useState<string>(lastActiveTab);

  // 当前选中草稿的详细状态
  const [currentDraftLoading, setCurrentDraftLoading] = useState(false);
  const [currentDraftTitle, setCurrentDraftTitle] = useState<string>('');
  const [currentDraftContent, setCurrentDraftContent] = useState<string>('');
  const [currentDraftFiles, setCurrentDraftFiles] = useState<DraftFileDataClient[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!selectedDraftId && lastSelectedDraftId) {
      router.push(`/dashboard/drafts?draftId=${lastSelectedDraftId}`);
    }
  }, [lastSelectedDraftId, selectedDraftId, router]);

  // 自动保存功能
  useEffect(() => {
    if (hasUnsavedChanges && selectedDraftId) {
      const timer = setTimeout(() => {
        saveCurrentDraft();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentDraftTitle, currentDraftContent, currentDraftFiles, hasUnsavedChanges, selectedDraftId]);

  // 监听选中草稿变化，加载草稿详情
  useEffect(() => {
    if (selectedDraftId) {
      loadCurrentDraft(selectedDraftId);
      setLastSelectedDraftId(selectedDraftId);
    } else {
      // 清空当前草稿状态
      setCurrentDraftTitle('');
      setCurrentDraftContent('');
      setCurrentDraftFiles([]);
      setHasUnsavedChanges(false);
      setLastSelectedDraftId(null);
    }
  }, [selectedDraftId]);

  /**
   * 加载当前选中草稿的详细信息
   */
  const loadCurrentDraft = async (draftId: string) => {
    setCurrentDraftLoading(true);
    try {
      const result = await getDynamicDraft(draftId);
      if (result.success && result.data) {
        setCurrentDraftTitle(result.data.title || '');
        setCurrentDraftContent(result.data.content || '');
        setCurrentDraftFiles(
          ((result.data.files as DraftFileDataClient[]) || []).map((f) => ({
            ...f,
            rid: f.rid || nanoid(),
          })),
        );
        setHasUnsavedChanges(false);
      } else {
        addToast({
          title: result.error || t('editor.toast.loadFailed'),
          color: 'danger',
        });
        setLastSelectedDraftId(null);
        router.push('/dashboard/drafts');
      }
    } catch (error) {
      addToast({
        title: t('editor.toast.loadFailed'),
        color: 'danger',
      });
      setLastSelectedDraftId(null);
      router.push('/dashboard/drafts');
    } finally {
      setCurrentDraftLoading(false);
    }
  };

  /**
   * 保存当前草稿
   */
  const saveCurrentDraft = async () => {
    if (!selectedDraftId) return;
    // Only update local state, do not proceed if there are local files
    if (currentDraftFiles.some((f) => f.source === 'local')) {
      return;
    }

    try {
      setAutoSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const filesToSave: DraftFileData[] = currentDraftFiles.map(({ file: _f, uploadProgress: _u, ...rest }) => rest);
      const result = await updateDynamicDraft(selectedDraftId, {
        title: currentDraftTitle,
        content: currentDraftContent,
        files: filesToSave,
      });

      if (result.success) {
        setHasUnsavedChanges(false);
        // 更新草稿列表中的草稿信息
        setDrafts((prevDrafts) =>
          prevDrafts.map((d) =>
            d.id === selectedDraftId
              ? { ...d, title: currentDraftTitle, content: currentDraftContent, updatedAt: new Date() }
              : d,
          ),
        );
      } else {
        addToast({
          title: result.error || t('editor.toast.saveFailed'),
          color: 'danger',
        });
      }
    } catch (error) {
      addToast({
        title: t('editor.toast.saveFailed'),
        color: 'danger',
      });
    } finally {
      setAutoSaving(false);
    }
  };

  /**
   * 更新当前草稿标题
   */
  const updateCurrentDraftTitle = (title: string) => {
    setCurrentDraftTitle(title);
    setHasUnsavedChanges(true);
  };

  /**
   * 更新当前草稿内容
   */
  const updateCurrentDraftContent = (content: string) => {
    setCurrentDraftContent(content);
    setHasUnsavedChanges(true);
  };

  /**
   * 更新当前草稿文件
   */
  const updateCurrentDraftFiles = (files: DraftFileDataClient[]) => {
    setCurrentDraftFiles(files);
    // Only set unsaved changes if there is no file with type 'local'
    const hasLocal = files.some((f) => f.source === 'local');
    if (!hasLocal) {
      setHasUnsavedChanges(true);
    }
  };

  /**
   * 添加文件到当前草稿
   */
  const addFileToCurrentDraft = (file: DraftFileDataClient) => {
    setCurrentDraftFiles((prev) => [...prev, file]);
    setHasUnsavedChanges(true);
  };

  /**
   * Handle image selection from media library
   */
  const handleSelectImage = async (imageFile: {
    id: string;
    filename: string | null;
    key: string;
    type: string | null;
    size: number;
    previewUrl?: string | null;
  }) => {
    if (!selectedDraftId) {
      addToast({
        title: '请先选择一个草稿',
        color: 'warning',
      });
      return;
    }

    try {
      // Get preview URL for the image
      let imageUrl = imageFile.previewUrl;
      if (!imageUrl) {
        const response = await fetch(`/api/v1/file/${imageFile.id}/preview`);
        const data = await response.json();
        if (data.code === 0) {
          imageUrl = data.data.previewUrl;
        }
      }

      if (!imageUrl) {
        addToast({
          title: '无法获取图片URL',
          color: 'danger',
        });
        return;
      }

      // Create new file data for the image
      const newImageFile: DraftFileDataClient = {
        rid: nanoid(),
        source: 'mp_oss',
        name: imageFile.filename || `image-${imageFile.id.slice(-8)}`,
        url: imageUrl,
        type: imageFile.type || 'image/jpeg',
        size: imageFile.size,
        uploadProgress: 100,
      };

      // Add image to current draft's files
      addFileToCurrentDraft(newImageFile);

      addToast({
        title: `成功添加图片到当前草稿`,
        color: 'success',
      });
    } catch (error) {
      console.error('Failed to add image to draft:', error);
      addToast({
        title: '添加图片失败',
        color: 'danger',
      });
    }
  };

  /**
   * Handle AI generated image insertion
   */
  const handleInsertGeneratedImage = async (imageUrl: string) => {
    if (!selectedDraftId) {
      addToast({ title: '请先选择一个草稿', color: 'warning' });
      return;
    }

    try {
      addToast({ title: '正在插入图片...', color: 'default' });

      // Fetch the image to get blob for size and type
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const newImageFile: DraftFileDataClient = {
        rid: nanoid(),
        source: 'generated',
        name: `generated-image-${nanoid(8)}.${blob.type.split('/')[1] || 'png'}`,
        url: imageUrl,
        type: blob.type,
        size: blob.size,
        uploadProgress: 100,
      };

      addFileToCurrentDraft(newImageFile);
      addToast({ title: '图片已成功插入草稿', color: 'success' });
    } catch (error) {
      console.error('Failed to insert generated image:', error);
      addToast({ title: '插入图片失败', color: 'danger' });
    }
  };

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

  const handleSave = async () => {
    if (!selectedDraftId) {
      addToast({
        title: 'No draft selected',
        color: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      await saveCurrentDraft();
      addToast({
        title: 'Draft saved successfully',
        color: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Failed to save draft',
        color: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setLastActiveTab(key);
  };

  // Function to open publish modal - can be used by child components
  const handleOpenPublishModal = () => {
    if (!selectedDraftId) {
      addToast({
        title: 'Please select a draft to publish',
        color: 'warning',
      });
      return;
    }
    setIsPublishModalOpen(true);
  };

  const handleApplyPolish = React.useCallback(
    (data: { title?: string; content?: string }) => {
      if (data.title) {
        updateCurrentDraftTitle(data.title);
      }
      if (data.content) {
        updateCurrentDraftContent(data.content);
      }
      setHasUnsavedChanges(true);
    },
    [], // 依赖项为空，因为函数不依赖于任何会变化的 props 或 state
  );

  const handleClosePublishModal = () => {
    setIsPublishModalOpen(false);
  };

  const handlePublishSuccess = () => {
    addToast({
      title: 'Publish task created successfully',
      color: 'success',
    });
  };

  const handleDirectPublish = () => {
    if (!selectedDraftId) {
      addToast({
        title: 'Please select a draft to publish',
        color: 'warning',
      });
      return;
    }
    setIsDirectPublishModalOpen(true);
  };

  const handleCloseDirectPublishModal = () => {
    setIsDirectPublishModalOpen(false);
  };

  const handleDirectPublishSuccess = () => {
    addToast({
      title: 'Direct publish completed successfully',
      color: 'success',
    });
    setIsDirectPublishModalOpen(false);
  };

  const handleShowMediaLibrary = () => {
    handleTabChange('media');
  };

  const handleShowAiImage = () => {
    handleTabChange('ai-image');
  };

  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-default-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-default-200 bg-default-50/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-default-700">{t('title')}</h1>
          {selectedDraft && (
            <span className="max-w-[300px] truncate text-sm text-default-500">
              {(() => {
                // Get display text: title first, then content, finally fallback
                const getTitleText = () => {
                  if (currentDraftTitle && currentDraftTitle.trim()) {
                    return currentDraftTitle.trim();
                  }
                  if (currentDraftContent && currentDraftContent.trim()) {
                    // Remove markdown syntax and get plain text
                    const plainText = currentDraftContent
                      .trim()
                      .replace(/[#*`\[\]]/g, '')
                      .replace(/\n+/g, ' ');
                    return plainText;
                  }
                  return 'Untitled Draft';
                };

                return getTitleText();
              })()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<Plus className="size-4" />}
            onPress={handleCreateDraft}
            isLoading={creating}
            className="hidden sm:flex">
            {t('newDraft')}
          </Button>

          <Button
            size="sm"
            variant="flat"
            startContent={<Save className="size-4" />}
            onPress={handleSave}
            isLoading={saving}
            isDisabled={!selectedDraftId || autoSaving}>
            {autoSaving ? t('autoSaving') : saving ? t('saving') : t('save')}
          </Button>

          <Button
            size="sm"
            color="primary"
            startContent={<Send className="size-4" />}
            onPress={handleOpenPublishModal}
            isDisabled={!selectedDraftId}>
            {t('clientPublish')}
          </Button>

          <Button
            size="sm"
            color="warning"
            variant="flat"
            startContent={<Zap className="size-4" />}
            onPress={handleDirectPublish}
            isDisabled={!selectedDraftId}>
            {t('directPublish')}
          </Button>
        </div>
      </header>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full">
          {/* Side Panel with Tabs */}
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={40}>
            <div className="flex h-full flex-col bg-default-100">
              <div className="border-b border-divider px-4 pt-2">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={(key) => handleTabChange(key as string)}
                  variant="underlined"
                  classNames={{
                    base: 'w-full',
                    tabList: 'gap-6 relative rounded-none p-0 pb-2 overflow-x-auto',
                    cursor: 'w-full bg-primary',
                    tab: 'max-w-fit px-0 h-8',
                    tabContent: 'group-data-[selected=true]:text-primary text-default-600 font-medium',
                  }}>
                  <Tab
                    key="drafts"
                    title={
                      <div className="flex items-center gap-2">
                        <FileText className="size-4" />
                        <span>{t('tabs.drafts')}</span>
                      </div>
                    }
                  />
                  <Tab
                    key="ai-polish"
                    title={
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4" />
                        <span>{t('tabs.aiCreation')}</span>
                      </div>
                    }
                  />
                  <Tab
                    key="ai-image"
                    title={
                      <div className="flex items-center gap-2">
                        <BotIcon className="size-4" />
                        <span>{t('tabs.aiImage')}</span>
                      </div>
                    }
                  />
                  <Tab
                    key="ai-poster"
                    title={
                      <div className="flex items-center gap-2">
                        <BotIcon className="size-4" />
                        <span>{t('tabs.aiPoster')}</span>
                      </div>
                    }
                  />
                  <Tab
                    key="media"
                    title={
                      <div className="flex items-center gap-2">
                        <Image className="size-4" />
                        <span>{t('tabs.mediaLibrary')}</span>
                      </div>
                    }
                  />
                </Tabs>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'drafts' && (
                  <DraftList
                    drafts={drafts}
                    selectedDraftId={selectedDraftId}
                    onSelectDraft={handleSelectDraft}
                    onDeleteDraft={handleDeleteDraft}
                    isCreating={creating}
                  />
                )}
                {activeTab === 'media' && (
                  <div className="h-full overflow-y-auto p-4">
                    <MediaLibrary onSelectImage={handleSelectImage} />
                  </div>
                )}
                {activeTab === 'ai-polish' && (
                  <ChatCreationPanel
                    draftId={selectedDraftId || ''}
                    draftTitle={currentDraftTitle}
                    draftContent={currentDraftContent}
                    onApply={handleApplyPolish}
                  />
                )}
                {activeTab === 'ai-image' && (
                  <div className="h-full overflow-y-auto p-4">
                    <ImageGeneratePanel
                      draftTitle={currentDraftTitle}
                      draftContent={currentDraftContent}
                      onInsertImage={handleInsertGeneratedImage}
                    />
                  </div>
                )}
                {activeTab === 'ai-poster' && (
                  <div className="h-full overflow-y-auto p-4">
                    <PosterGeneratePanel
                      draftTitle={currentDraftTitle}
                      draftContent={currentDraftContent}
                      onInsertImage={handleInsertGeneratedImage}
                    />
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor Panel */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full bg-white dark:bg-black">
              <DraftEditor
                draftId={selectedDraftId}
                loading={currentDraftLoading}
                title={currentDraftTitle}
                content={currentDraftContent}
                files={currentDraftFiles}
                onTitleChange={updateCurrentDraftTitle}
                onContentChange={updateCurrentDraftContent}
                onFilesChange={updateCurrentDraftFiles}
                onShowMediaLibrary={handleShowMediaLibrary}
                onShowAiImage={handleShowAiImage}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Publish Modal */}
      <ClientPublishModal
        isOpen={isPublishModalOpen}
        onClose={handleClosePublishModal}
        draftId={selectedDraftId || undefined}
        onSuccess={handlePublishSuccess}
      />

      {/* Direct Publish Modal */}
      <DirectPublishModal
        isOpen={isDirectPublishModalOpen}
        onClose={handleCloseDirectPublishModal}
        draftId={selectedDraftId || ''}
        draftData={{
          title: currentDraftTitle,
          content: currentDraftContent,
          images: currentDraftFiles
            .filter((f) => f.type.startsWith('image'))
            .map((f) => ({
              id: f.rid || '',
              name: f.name,
              url: f.url,
              type: f.type,
              size: f.size,
              originUrl: f.url,
            })),
          videos: currentDraftFiles
            .filter((f) => f.type.startsWith('video'))
            .map((f) => ({
              id: f.rid || '',
              name: f.name,
              url: f.url,
              type: f.type,
              size: f.size,
              originUrl: f.url,
            })),
        }}
        onSuccess={handleDirectPublishSuccess}
      />
    </div>
  );
}
