'use client';

import { Button, addToast, Spinner, Input, cn, Progress, Image } from '@heroui/react';
import { FileTextIcon, XIcon, GripVerticalIcon, PlayCircleIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { DraftFileDataClient } from '../-types';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { useTranslation } from '@/i18n/client';
import DirectPublishModal from './DriectPublishModal';

const Viewer = React.lazy(() => import('react-viewer'));
const ReactPlayer = React.lazy(() => import('react-player'));

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
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
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
          <React.Suspense fallback={<div className="size-full animate-pulse bg-default-200" />}>
            <ReactPlayer
              url={file.url}
              width="100%"
              height="100%"
              playing={false}
              controls={false}
              volume={0}
              muted
            />
          </React.Suspense>
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
  loading = false,
  title,
  content,
  files,
  onTitleChange,
  onContentChange,
  onFilesChange,
  onShowMediaLibrary,
  onShowAiImage,
  className,
}: {
  draftId: string | null;
  loading?: boolean;
  title: string;
  content: string;
  files: DraftFileDataClient[];
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onFilesChange: (files: DraftFileDataClient[]) => void;
  onShowMediaLibrary?: () => void;
  onShowAiImage: () => void;
  className?: string;
}) {
  const { t } = useTranslation('draft');
  const { t: tPublish } = useTranslation('publish');

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<DraftFileDataClient[]>(files);
  const sensors = useSensors(useSensor(PointerSensor));
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  // const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDirectPublishModalOpen, setIsDirectPublishModalOpen] = useState(false);

  // Keep filesRef in sync with files prop
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const fileIds = useMemo(() => files.map((f) => f.rid).filter((rid): rid is string => !!rid), [files]);

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect({
        target: {
          files: droppedFiles,
        },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleDeleteFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    console.log('onFilesChange', newFiles);
    onFilesChange(newFiles);
  };

  const uploadFile = useCallback(
    async (file: File, rid: string) => {
      try {
        const { data: presignData } = await axios.post('/api/v1/file/create', {
          filename: file.name,
        });

        if (presignData.code !== 0 || !presignData.data?.url) {
          throw new Error('Failed to get presigned url');
        }

        await axios.put(presignData.data.url, file, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const progress = Math.min(99, Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1)));
            // Use ref to get latest files state
            const updatedFiles = filesRef.current.map((f) => (f.rid === rid ? { ...f, uploadProgress: progress } : f));
            console.log('onFilesChange', updatedFiles);
            onFilesChange(updatedFiles);
          },
        });

        const { data: previewData } = await axios.get(`/api/v1/file/${presignData.data.fileId}/preview`);

        if (previewData.code !== 0 || !previewData.data?.previewUrl) {
          throw new Error('Failed to get preview url');
        }

        // Use ref to get latest files state
        const updatedFiles = filesRef.current.map((f) =>
          f.rid === rid
            ? { ...f, url: previewData.data.previewUrl, uploadProgress: 100, source: 'mp_oss' as const }
            : f,
        );
        console.log('onFilesChange', updatedFiles);
        onFilesChange(updatedFiles);
      } catch (error) {
        console.error('Upload failed', error);
        addToast({ title: t('editor.toast.uploadFailed'), color: 'danger' });
        // Use ref to get latest files state
        const filteredFiles = filesRef.current.filter((f) => f.rid !== rid);
        console.log('onFilesChange', filteredFiles);
        onFilesChange(filteredFiles);
      }
    },
    [t, onFilesChange],
  );

  // const handleAiImageGenerated = (newImage: { name: string; type: string; size: number; url: string }) => {
  //   const newFile: DraftFileDataClient = {
  //     rid: nanoid(),
  //     name: newImage.name,
  //     type: newImage.type,
  //     size: newImage.size,
  //     url: newImage.url,
  //     source: 'remote_url',
  //     uploadProgress: 100,
  //   };
  //   console.log('onFilesChange', [...files, newFile]);
  //   onFilesChange([...files, newFile]);
  //   setIsAiModalOpen(false);
  // };

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

      console.log('onFilesChange', [...files, ...newFiles]);
      onFilesChange([...files, ...newFiles]);
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

        console.log('onFilesChange', [...files, ...newFiles]);
        onFilesChange([...files, ...newFiles]);
      }
    },
    [uploadFile, files, onFilesChange],
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
      const oldIndex = files.findIndex((item) => item.rid === active.id);
      const newIndex = files.findIndex((item) => item.rid === over.id);
      const newItems = arrayMove(files, oldIndex, newIndex);
      console.log('onFilesChange', newItems);
      onFilesChange(newItems);
    }
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
    <>
      <div
        className={cn('h-full p-4', className, isDraggingOver && 'bg-primary/10')}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>
        <div className="flex h-full flex-col items-center gap-4">
          {/* Title Input */}
          <div className="w-full max-w-2xl">
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('editor.titlePlaceholder')}
              endContent={<div className="text-xs text-default-400">{title.length}</div>}
              classNames={{
                input: 'text-lg font-semibold',
              }}
            />
          </div>

          {/* Content Textarea */}
          <div className="relative min-h-0 w-full max-w-2xl flex-1">
            <textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t('editor.contentPlaceholder')}
              className="size-full resize-none rounded-lg bg-zinc-100 p-3 pb-8 text-foreground focus:border-primary focus:outline-hidden dark:bg-zinc-800"
            />
            <div className="pointer-events-none absolute bottom-2 right-3 text-xs text-default-400">
              {content.length}
            </div>
          </div>

          {/* Files Display */}
          <div className="shrink-0">
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
                    onClick={onShowMediaLibrary}
                    icon="lucide:library"
                    text={tPublish('dynamic.library')}
                  />
                  <ActionPlaceholder
                    onClick={onShowAiImage}
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
      {viewerVisible && (
        <React.Suspense fallback={null}>
          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            images={files.filter((f) => f.type.startsWith('image')).map((f) => ({ src: f.url, alt: f.name }))}
            activeIndex={currentImage}
          />
        </React.Suspense>
      )}
      {/* <ImageGenerationModal
        isOpen={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        onImageGenerated={handleAiImageGenerated}
        initialPromptBasis={{ title, content }}
      /> */}
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
    </>
  );
}
