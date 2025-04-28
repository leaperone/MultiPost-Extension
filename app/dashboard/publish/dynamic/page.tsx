'use client';

// Define interfaces at the top
interface FileData {
  name: string;
  type: string;
  size: number;
  url: string;
  hash?: string;
  file?: File;
}

// 为Google Analytics添加类型声明
declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import {
  Card,
  Button,
  Image,
  Input,
  Textarea,
  CardHeader,
  CardBody,
  CardFooter,
  Switch,
  addToast,
  Accordion,
  AccordionItem,
} from '@heroui/react';
import {
  ImagePlusIcon,
  VideoIcon,
  XIcon,
  TrashIcon,
  BotIcon,
  HandIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  Eraser,
  UploadIcon,
  GripVerticalIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/client';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { PlatformInfo } from '@/lib/extension';
import type { SyncData } from '@/lib/extension';

import { funcPublish, getPlatformInfos } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

const DropZone = ({ onFilesDrop }: { onFilesDrop: (files: File[], type: 'image' | 'video') => void }) => {
  const { t } = useTranslation('publish');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = Array.from(event.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      const videoFiles = files.filter((file) => file.type.startsWith('video/'));

      if (imageFiles.length > 0) {
        onFilesDrop(imageFiles, 'image');
      }
      if (videoFiles.length > 0) {
        onFilesDrop(videoFiles, 'video');
      }
    },
    [onFilesDrop],
  );

  return (
    <div
      className={cn(
        'relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}>
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <UploadIcon className={cn('size-8', isDragging ? 'text-primary' : 'text-gray-500')} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{isDragging ? t('dynamic.tips.drop') : t('dynamic.tips.dragAndDrop')}</p>
          <p className="text-xs text-gray-500">{t('dynamic.tips.supportedFiles')}</p>
        </div>
      </div>
    </div>
  );
};

interface SortableMediaProps {
  id: string;
  file: FileData;
  index: number;
  type: 'image' | 'video';
  onDelete: (index: number, type: 'image' | 'video') => void;
  onImageClick?: (index: number) => void;
}

const SortableMedia = ({ id, file, index, type, onDelete, onImageClick }: SortableMediaProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative', type === 'video' && 'aspect-video w-full')}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-50 m-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
        <GripVerticalIcon className="size-4" />
      </div>
      {type === 'image' ? (
        <Image
          src={file.url}
          alt={file.name}
          width={100}
          height={100}
          className="cursor-pointer rounded-md object-cover"
          onClick={() => onImageClick?.(index)}
        />
      ) : (
        <ReactPlayer
          url={file.url}
          width="100%"
          height="100%"
          controls
        />
      )}
      <Button
        isIconOnly
        size="sm"
        color="danger"
        className={cn(
          'absolute right-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100',
          type === 'image' ? 'top-0' : 'right-2 top-2',
        )}
        onPress={() => onDelete(index, type)}>
        <XIcon className="size-4" />
      </Button>
    </div>
  );
};

// Add these helper functions before the DynamicPage component
const getFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const isDuplicateFile = async (file: File, existingFiles: FileData[]): Promise<boolean> => {
  const newFileHash = await getFileHash(file);
  for (const existingFile of existingFiles) {
    // 如果文件已经有哈希值，直接比较
    if (existingFile.hash === newFileHash) {
      return true;
    }
    // 如果文件没有哈希值（旧文件），则需要重新计算
    if (!existingFile.hash && existingFile.file) {
      const existingHash = await getFileHash(existingFile.file);
      existingFile.hash = existingHash; // 保存计算结果以备后用
      if (existingHash === newFileHash) {
        return true;
      }
    }
  }
  return false;
};

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

export default function DynamicPage() {
  const { t } = useTranslation('publish');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { dynamicPlatforms, setDynamicPlatforms, clearDynamicPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(dynamicPlatforms);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent, type: 'image' | 'video') => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex =
        type === 'image'
          ? images.findIndex((item) => `image-${item.name}` === active.id)
          : videos.findIndex((item) => `video-${item.name}` === active.id);
      const newIndex =
        type === 'image'
          ? images.findIndex((item) => `image-${item.name}` === over.id)
          : videos.findIndex((item) => `video-${item.name}` === over.id);

      if (type === 'image') {
        setImages((items) => arrayMove(items, oldIndex, newIndex));
      } else {
        setVideos((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('Development title');
      setContent('Development content');
    }
  }, []);

  useEffect(() => {
    async function fetchPlatforms() {
      const [platformData, extraConfigList] = await Promise.all([
        getPlatformInfos('DYNAMIC'),
        getPlatformExtraConfigList(),
      ]);

      if (extraConfigList.success && extraConfigList.data) {
        const extraConfigMap = extraConfigList.data.reduce(
          (acc, item) => {
            acc[item.platform] = item.data;
            return acc;
          },
          {} as Record<string, unknown>,
        );

        const platformsWithExtra = platformData.map((platform) => ({
          ...platform,
          extraConfig: extraConfigMap[platform.name],
        })) satisfies PlatformInfo[];

        setPlatforms(platformsWithExtra);
      } else {
        setPlatforms(platformData);
      }
    }
    fetchPlatforms();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const existingFiles = fileType === 'image' ? images : videos;
    const newFiles: FileData[] = [];
    const duplicates: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      if (!file.type.startsWith(fileType + '/')) continue;

      const isDuplicate = await isDuplicateFile(file, existingFiles);
      if (isDuplicate) {
        duplicates.push(file.name);
        continue;
      }

      const fileHash = await getFileHash(file);
      newFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        hash: fileHash,
        file: file,
      });
    }

    if (duplicates.length > 0) {
      addToast({
        title: t('upload.duplicateFiles'),
        description: `${t('upload.duplicateFilesDesc')}: ${duplicates.join(', ')}`,
        color: 'warning',
      });
    }

    if (newFiles.length > 0) {
      if (fileType === 'image') {
        setImages((prev) => [...prev, ...newFiles]);
      } else {
        setVideos((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);
      return newSelected;
    });
  };

  useEffect(() => {
    setDynamicPlatforms(selectedPlatforms);
  }, [selectedPlatforms, setDynamicPlatforms]);

  const handlePublish = async () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired'),
        color: 'danger',
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        title: t('validation.platformRequired'),
        color: 'danger',
      });
      return;
    }

    // 向Google Analytics发送自定义事件
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'dynamic_publish', {
        event_category: 'publish',
        event_label: selectedPlatforms.join(','),
        platform_count: selectedPlatforms.length,
        has_images: images.length > 0,
        has_videos: videos.length > 0,
        auto_publish: autoPublish,
      });
    }

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        images,
        videos,
      },
      isAutoPublish: autoPublish,
    };

    try {
      funcPublish(data);
    } catch (error) {
      console.error('Error publishing:', error);
      funcPublish(data);
    }
  };

  const handleIconClick = (type: 'image' | 'video') => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleDeleteFile = (index: number, fileType: 'image' | 'video') => {
    if (fileType === 'image') {
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    } else {
      setVideos((prevVideos) => prevVideos.filter((_, i) => i !== index));
    }
  };

  const handleClearAll = () => {
    setImages([]);
    setVideos([]);
    setTitle('');
    setContent('');
    setSelectedPlatforms([]);
    clearDynamicPlatforms();
    setAutoPublish(false);
  };

  const handleNextStep = () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired'),
        color: 'danger',
      });
      return;
    }
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleExtraConfigChange = (platformKey: string, extraConfig: unknown) => {
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => (platform.name === platformKey ? { ...platform, extraConfig } : platform)),
    );
  };

  // 处理粘贴事件
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const fileData: FileData = {
            name: `pasted-image-${Date.now()}.${item.type.split('/')[1]}`,
            type: item.type,
            size: file.size,
            url: URL.createObjectURL(file),
          };
          setImages((prev) => [...prev, fileData]);
        }
      }
    }
  }, []);

  const handleFilesDrop = useCallback(
    async (files: File[], type: 'image' | 'video') => {
      const existingFiles = type === 'image' ? images : videos;
      const newFiles: FileData[] = [];
      const duplicates: string[] = [];

      for (const file of files) {
        if (!file.type.startsWith(type + '/')) continue;

        const isDuplicate = await isDuplicateFile(file, existingFiles);
        if (isDuplicate) {
          duplicates.push(file.name);
          continue;
        }

        const fileHash = await getFileHash(file);
        newFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          hash: fileHash,
          file: file,
        });
      }

      if (duplicates.length > 0) {
        addToast({
          title: t('upload.duplicateFiles'),
          color: 'warning',
          description: `${t('upload.duplicateFilesDesc')}: ${duplicates.join(', ')}`,
        });
      }

      if (newFiles.length > 0) {
        if (type === 'image') {
          setImages((prev) => [...prev, ...newFiles]);
        } else {
          setVideos((prev) => [...prev, ...newFiles]);
        }
      }
    },
    [images, videos],
  );

  // 添加粘贴事件监听
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <>
      {currentStep === 1 ? (
        <div className="flex flex-col gap-2">
          <Card className="h-fit bg-default-50 shadow-none">
            <CardHeader>
              <Input
                isClearable
                variant="underlined"
                placeholder={t('dynamic.title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onClear={() => setTitle('')}
                className="w-full"
              />
            </CardHeader>

            <CardBody>
              <Textarea
                isClearable
                variant="underlined"
                placeholder={t('dynamic.content')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onClear={() => setContent('')}
                fullWidth
                minRows={5}
                autoFocus
              />
            </CardBody>

            <CardFooter>
              <div className="mb-4 flex w-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'image')}
                      className="hidden"
                      multiple
                    />
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={() => handleIconClick('image')}>
                      <ImagePlusIcon className="size-8 text-gray-600" />
                    </Button>
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/*"
                      onChange={(e) => handleFileChange(e, 'video')}
                      className="hidden"
                      multiple
                    />
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={() => handleIconClick('video')}>
                      <VideoIcon className="size-8 text-gray-600" />
                    </Button>
                  </div>
                  {(title || content || images.length > 0 || videos.length > 0) && (
                    <Button
                      isIconOnly
                      variant="light"
                      color="danger"
                      onPress={handleClearAll}
                      title={t('dynamic.clearAll')}>
                      <TrashIcon className="size-6" />
                    </Button>
                  )}
                </div>

                <DropZone onFilesDrop={handleFilesDrop} />
              </div>
            </CardFooter>
          </Card>

          {images.length > 0 && (
            <Card className="my-2 bg-default-50 shadow-none">
              <CardBody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, 'image')}>
                  <SortableContext
                    items={images.map((file) => `image-${file.name}`)}
                    strategy={horizontalListSortingStrategy}>
                    <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                      {images.map((file, index) => (
                        <SortableMedia
                          key={`image-${file.name}`}
                          id={`image-${file.name}`}
                          file={file}
                          index={index}
                          type="image"
                          onDelete={handleDeleteFile}
                          onImageClick={handleImageClick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardBody>
            </Card>
          )}

          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            images={images.map((file) => ({ src: file.url, alt: file.name }))}
            activeIndex={currentImage}
          />

          {videos.length > 0 && (
            <Card className="my-2 bg-default-50 shadow-none">
              <CardBody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, 'video')}>
                  <SortableContext
                    items={videos.map((file) => `video-${file.name}`)}
                    strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-4">
                      {videos.map((file, index) => (
                        <SortableMedia
                          key={`video-${file.name}`}
                          id={`video-${file.name}`}
                          file={file}
                          index={index}
                          type="video"
                          onDelete={handleDeleteFile}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardBody>
            </Card>
          )}

          <Button
            fullWidth
            onPress={handleNextStep}>
            <ArrowRightIcon />
          </Button>
        </div>
      ) : (
        <>
          <Card className="mb-4 bg-default-50 shadow-none">
            <CardBody className="gap-2">
              <div className="flex items-center justify-between">
                <Switch
                  isSelected={autoPublish}
                  onValueChange={setAutoPublish}
                  startContent={<BotIcon className="size-4" />}
                  endContent={<HandIcon className="size-4" />}>
                  {t('dynamic.autoPublish')}
                </Switch>
                <div className="flex items-center justify-between">
                  {selectedPlatforms.length > 0 && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => setSelectedPlatforms([])}>
                      <Eraser className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Accordion
                isCompact
                variant="light"
                selectionMode="multiple"
                defaultExpandedKeys={['CN', 'International']}>
                <AccordionItem
                  key="CN"
                  title={t('platforms.cn')}
                  subtitle={`${
                    selectedPlatforms.filter((platform) => {
                      const info = platforms.find((p) => p.name === platform);
                      return info?.tags?.includes('CN');
                    }).length
                  }/${platforms.filter((platform) => platform.tags?.includes('CN')).length}`}
                  startContent={
                    <div className="w-8">
                      <Icon
                        icon="openmoji:flag-china"
                        className="h-max w-full"
                      />
                    </div>
                  }
                  className="py-1">
                  <div className="grid grid-cols-2 gap-2">
                    {platforms
                      .filter((platform) => platform.tags?.includes('CN'))
                      .map((platform) => (
                        <PlatformCheckbox
                          key={platform.name}
                          platformInfo={platform}
                          isSelected={selectedPlatforms.includes(platform.name)}
                          onChange={(_, isSelected) => handlePlatformChange(platform.name, isSelected)}
                          isDisabled={false}
                          onExtraConfigChange={handleExtraConfigChange}
                        />
                      ))}
                  </div>
                </AccordionItem>
                <AccordionItem
                  key="International"
                  title={t('platforms.international')}
                  subtitle={`${
                    selectedPlatforms.filter((platform) => {
                      const info = platforms.find((p) => p.name === platform);
                      return info?.tags?.includes('International');
                    }).length
                  }/${platforms.filter((platform) => platform.tags?.includes('International')).length}`}
                  startContent={
                    <div className="w-8">
                      <Icon
                        icon="openmoji:globe-with-meridians"
                        className="h-max w-full"
                      />
                    </div>
                  }
                  className="py-1">
                  <div className="grid grid-cols-2 gap-2">
                    {platforms
                      .filter((platform) => platform.tags?.includes('International'))
                      .map((platform) => (
                        <PlatformCheckbox
                          key={platform.name}
                          platformInfo={platform}
                          isSelected={selectedPlatforms.includes(platform.name)}
                          onChange={(_, isSelected) => handlePlatformChange(platform.name, isSelected)}
                          isDisabled={false}
                          onExtraConfigChange={handleExtraConfigChange}
                        />
                      ))}
                  </div>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <Button
              aria-label="back_to_edit"
              onPress={handlePrevStep}>
              <ArrowLeftIcon />
            </Button>

            <Button
              aria-label="publish"
              fullWidth
              color={selectedPlatforms.length === 0 ? 'default' : 'primary'}
              disabled={selectedPlatforms.length === 0}
              onPress={handlePublish}>
              <SendHorizontal />
            </Button>
          </div>
        </>
      )}
    </>
  );
}
