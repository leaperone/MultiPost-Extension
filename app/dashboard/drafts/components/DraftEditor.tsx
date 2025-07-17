'use client';

import { Button, addToast, Spinner, Input, Textarea, cn, Progress, Image } from '@heroui/react';
import { FileTextIcon, SaveIcon, XIcon, GripVerticalIcon, PlayCircleIcon, SendIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDynamicDraft, updateDynamicDraft } from '../actions';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import dynamic from 'next/dynamic';
import { DraftFileData, DraftFileDataClient, Draft } from '../types';
import ReactPlayer from 'react-player';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { useTranslation } from '@/i18n/client';
import { ImageGenerationModal } from '@/app/dashboard/publish/dynamic/components/ImageGenerationModal';
import LibraryModal from '@/app/dashboard/publish/dynamic/components/LibraryModal';
import DirectPublishModal from './DriectPublishModal';

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

const ActionPlaceholder = ({ onClick, icon, text }: { onClick?: () => void; icon: string; text: string }) => (
  <button
    type="button"
    className="flex aspect-square w-[100px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-default-300 bg-default-100 text-default-500 transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
    onClick={onClick}>
    <Icon
      icon={icon}
      className="size-8"
    />
    <p className="text-xs">{text}</p>
  </button>
);

interface SortableMediaProps {
  id: string;
  file: DraftFileDataClient;
  index: number;
  type: string;
  onDelete: (index: number, type: string) => void;
  onImageClick?: (index: number) => void;
  onVideoClick?: (url: string) => void;
}

const UploadOverlay = ({ progress }: { progress: number }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
    <Progress
      size="lg"
      isIndeterminate={progress === 0}
      value={progress}
      className="max-w-md"
      showValueLabel
    />
  </div>
);

const SortableMedia = ({ id, file, index, type, onDelete, onImageClick, onVideoClick }: SortableMediaProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUploading = file.source === 'local' && (file.uploadProgress ?? 0) < 100;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square w-[100px] overflow-hidden rounded-md bg-default-100">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-50 m-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
        <GripVerticalIcon className="size-4" />
      </div>
      {type.startsWith('image') && (
        <Image
          src={file.url}
          alt={file.name}
          width={100}
          height={100}
          className="cursor-pointer object-cover"
          onClick={() => !isUploading && onImageClick?.(index)}
        />
      )}
      {type.startsWith('video') && (
        <div
          className="size-full cursor-pointer"
          onClick={() => !isUploading && onVideoClick?.(file.url)}>
          <ReactPlayer
            url={file.url}
            width="100%"
            height="100%"
            playing={false}
            controls={false}
            volume={0}
            muted
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <PlayCircleIcon className="size-8 text-white" />
          </div>
        </div>
      )}
      {isUploading && <UploadOverlay progress={file.uploadProgress!} />}
      {!isUploading && (
        <Button
          isIconOnly
          size="sm"
          color="danger"
          className="absolute right-0 top-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
          onPress={() => onDelete(index, file.type)}>
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  );
};

export function DraftEditor({
  draftId,
  onDraftUpdate,
  onOpenPublishModal,
}: {
  draftId: string | null;
  onDraftUpdate: (draft: Draft) => void;
  onOpenPublishModal?: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation('draft');
  const { t: tPublish } = useTranslation('publish');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [files, setFiles] = useState<DraftFileDataClient[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [isLibraryModalOpen, setLibraryModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDirectPublishModalOpen, setIsDirectPublishModalOpen] = useState(false);

  const fileIds = useMemo(() => files.map((f) => f.rid).filter((rid): rid is string => !!rid), [files]);

  const saveToServer = useCallback(
    async (data: { title?: string; content?: string; files?: DraftFileDataClient[] }) => {
      if (!draftId) return;
      try {
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const filesToSave: DraftFileData[] = data.files?.map(({ file: _f, uploadProgress: _u, ...rest }) => rest) || [];
        const result = await updateDynamicDraft(draftId, { ...data, files: filesToSave });
        if (result.success) {
          setHasUnsavedChanges(false);
          onDraftUpdate(result.data?.draft as unknown as Draft);
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
        setSaving(false);
      }
    },
    [draftId, onDraftUpdate, t],
  );

  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => saveToServer({ title, content, files }), 2000);
      return () => clearTimeout(timer);
    }
  }, [title, content, files, hasUnsavedChanges, saveToServer]);

  useEffect(() => {
    if (draftId) {
      setLoading(true);
      getDynamicDraft(draftId)
        .then((result) => {
          if (result.success) {
            if (result.data) {
              setTitle(result.data.title || '');
              setContent(result.data.content || '');
              setFiles(
                ((result.data.files as DraftFileDataClient[]) || []).map((f) => ({
                  ...f,
                  rid: f.rid || nanoid(),
                })),
              );
              setHasUnsavedChanges(false);
            }
          } else {
            addToast({ title: result.error || t('editor.toast.loadFailed'), color: 'danger' });
            router.push('/dashboard/draft');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [draftId, router, t]);

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleDeleteFile = (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      setHasUnsavedChanges(true);
      return newFiles;
    });
  };

  const uploadFile = useCallback(
    async (file: File, rid: string) => {
      try {
        const { data: presignData } = await axios.post('/api/v1/file/create', {
          name: file.name,
          contentType: file.type,
          size: file.size,
          type: 'dynamic-draft',
        });

        if (presignData.code !== 0 || !presignData.data?.url) {
          throw new Error('Failed to get presigned url');
        }

        await axios.put(presignData.data.url, file, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const progress = Math.min(99, Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1)));
            setFiles((prev) => prev.map((f) => (f.rid === rid ? { ...f, uploadProgress: progress } : f)));
          },
        });

        const { data: previewData } = await axios.get(`/api/v1/file/${presignData.data.fileId}/preview`);

        if (previewData.code !== 0 || !previewData.data?.url) {
          throw new Error('Failed to get preview url');
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.rid === rid ? { ...f, url: previewData.data.url, uploadProgress: 100, source: 'mp_oss' } : f,
          ),
        );
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error('Upload failed', error);
        addToast({ title: t('editor.toast.uploadFailed'), color: 'danger' });
        setFiles((prev) => prev.filter((f) => f.rid !== rid));
      }
    },
    [t],
  );

  const handleAiImageGenerated = (newImage: { name: string; type: string; size: number; url: string }) => {
    const newFile: DraftFileDataClient = {
      rid: nanoid(),
      name: newImage.name,
      type: newImage.type,
      size: newImage.size,
      url: newImage.url,
      source: 'remote_url',
      uploadProgress: 100,
    };
    setFiles((prev) => [...prev, newFile]);
    setHasUnsavedChanges(true);
    setIsAiModalOpen(false);
  };

  const handleSelectImageFromLibrary = (fileData: {
    name: string;
    type: string;
    size: number;
    url: string;
    file?: File;
  }) => {
    if (fileData.file) {
      const rid = nanoid();
      const newFile: DraftFileDataClient = {
        rid,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        url: URL.createObjectURL(fileData.file),
        source: 'local',
        uploadProgress: 0,
        file: fileData.file,
      };
      setFiles((prev) => [...prev, newFile]);
      if (newFile.file && newFile.rid) {
        uploadFile(newFile.file, newFile.rid);
      }
      setHasUnsavedChanges(true);
    } else {
      const newFile: DraftFileDataClient = {
        rid: nanoid(),
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        url: fileData.url,
        source: 'remote_url',
        uploadProgress: 100,
      };
      setFiles((prev) => [...prev, newFile]);
      setHasUnsavedChanges(true);
    }
    setLibraryModalOpen(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: DraftFileDataClient[] = Array.from(selectedFiles).map((file) => ({
        rid: nanoid(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        source: 'local',
        uploadProgress: 0,
        file,
      }));

      newFiles.forEach((f) => {
        if (f.file && f.rid) {
          uploadFile(f.file, f.rid);
        }
      });

      setFiles((prev) => [...prev, ...newFiles]);
      setHasUnsavedChanges(true);
    }
  };

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const filesToUpload: File[] = [];
      for (const item of items) {
        if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
          const file = item.getAsFile();
          if (file) {
            filesToUpload.push(file);
          }
        }
      }

      if (filesToUpload.length > 0) {
        const newFiles: DraftFileDataClient[] = filesToUpload.map((file) => ({
          rid: nanoid(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          source: 'local',
          uploadProgress: 0,
          file,
        }));

        newFiles.forEach((f) => {
          if (f.file && f.rid) {
            uploadFile(f.file, f.rid);
          }
        });

        setFiles((prev) => [...prev, ...newFiles]);
        setHasUnsavedChanges(true);
      }
    },
    [uploadFile],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((item) => item.rid === active.id);
        const newIndex = items.findIndex((item) => item.rid === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newItems;
      });
    }
  };

  const handleManualSave = () => {
    saveToServer({ title, content, files });
  };

  if (!draftId) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-default-200 bg-default-50">
        <FileTextIcon className="mb-4 size-16 text-default-300" />
        <h3 className="mb-2 text-lg font-semibold">{t('editor.placeholder.title')}</h3>
        <p className="text-default-500">{t('editor.placeholder.line1')}</p>
        <p className="text-default-500">{t('editor.placeholder.line2')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-default-200 p-4">
        <h2 className="text-xl font-semibold">{t('editor.header.title')}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">
            {saving
              ? t('editor.header.saving')
              : hasUnsavedChanges
                ? t('editor.header.unsaved')
                : t('editor.header.saved')}
          </span>
          <Button
            color="primary"
            startContent={<SaveIcon className="size-4" />}
            onPress={handleManualSave}
            isLoading={saving}>
            {t('editor.header.saveButton')}
          </Button>
          <Button
            color="success"
            variant="flat"
            startContent={<SendIcon className="size-4" />}
            onPress={onOpenPublishModal}
            isDisabled={!draftId || !content.trim()}>
            {t('editor.publishButton')}
          </Button>
          <Button
            color="primary"
            startContent={<SendIcon className="size-4" />}
            onPress={() => setIsDirectPublishModalOpen(true)}
            isDisabled={!draftId || !content.trim()}>
            {t('editor.directPublishButton')}
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-6">
          <Input
            label={t('editor.form.title.label')}
            placeholder={t('editor.form.title.placeholder')}
            value={title}
            onValueChange={(v) => {
              setTitle(v);
              setHasUnsavedChanges(true);
            }}
          />
          <Textarea
            label={t('editor.form.content.label')}
            placeholder={t('editor.form.content.placeholder')}
            value={content}
            onValueChange={(v) => {
              setContent(v);
              setHasUnsavedChanges(true);
            }}
            minRows={10}
          />
          <div>
            <h3 className="mb-2 text-sm font-medium text-default-700">{t('editor.form.images.title')}</h3>
            <div
              className={cn(
                'rounded-lg border-2 border-dashed border-default-200 p-4 transition-colors',
                isDraggingOver && 'border-primary bg-primary/10',
              )}
              onDragEnter={() => setIsDraggingOver(true)}
              onDragLeave={() => setIsDraggingOver(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                // handleDrop
              }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}>
                <SortableContext
                  items={fileIds}
                  strategy={horizontalListSortingStrategy}>
                  <div className="flex flex-wrap gap-4">
                    {files.map(
                      (file, index) =>
                        file.rid && (
                          <SortableMedia
                            key={file.rid}
                            id={file.rid}
                            file={file}
                            index={index}
                            type={file.type}
                            onDelete={() => handleDeleteFile(index)}
                            onImageClick={handleImageClick}
                          />
                        ),
                    )}
                    <ActionPlaceholder
                      icon="solar:gallery-add-bold"
                      text={t('editor.addImage')}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <ActionPlaceholder
                      onClick={() => setLibraryModalOpen(true)}
                      icon="lucide:library"
                      text={tPublish('dynamic.library')}
                    />
                    <ActionPlaceholder
                      onClick={() => setIsAiModalOpen(true)}
                      icon="lucide:bot"
                      text={tPublish('dynamic.aiGenerate')}
                    />
                  </div>
                </SortableContext>
              </DndContext>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
      <Viewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        images={files.filter((f) => f.type.startsWith('image')).map((f) => ({ src: f.url, alt: f.name }))}
        activeIndex={currentImage}
      />
      <LibraryModal
        isOpen={isLibraryModalOpen}
        onOpenChange={setLibraryModalOpen}
        onSelectImage={handleSelectImageFromLibrary}
        existingFiles={files}
      />
      <ImageGenerationModal
        isOpen={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        onImageGenerated={handleAiImageGenerated}
        initialPromptBasis={{ title, content }}
      />
      <DirectPublishModal
        isOpen={isDirectPublishModalOpen}
        onClose={() => setIsDirectPublishModalOpen(false)}
        draftId={draftId}
        draftData={{
          title,
          content,
          images: files
            .filter((f) => f.type.startsWith('image'))
            .map((f) => ({
              id: f.rid,
              name: f.name,
              url: f.url,
              type: f.type,
              size: f.size,
              originUrl: f.url,
            })),
          videos: files
            .filter((f) => f.type.startsWith('video'))
            .map((f) => ({
              id: f.rid,
              name: f.name,
              url: f.url,
              type: f.type,
              size: f.size,
              originUrl: f.url,
            })),
        }}
        onSuccess={() => {
          // Handle success if needed
        }}
      />
    </div>
  );
}
