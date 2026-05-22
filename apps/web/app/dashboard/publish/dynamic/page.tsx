'use client';

import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';

declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import {
  Button,
  Image,
  Input,
  Textarea,
  Switch,
  addToast,
  Accordion,
  AccordionItem,
  Tooltip,
  Link,
  Card,
} from '@heroui/react';
import {
  XIcon,
  TrashIcon,
  BotIcon,
  HandIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  Eraser,
  GripVerticalIcon,
  PlayCircleIcon,
  MessageSquareIcon,
  SigmaIcon,
  FileTextIcon,
  StarIcon,
  UploadIcon,
  FolderOpenIcon,
  SparklesIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { PlatformInfo } from '@/lib/extension';

import { funcPublish, getPlatformInfos } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import HeroTagInput from '../components/HeroTagInput';
import { useHydration } from '@/hooks/useHydration';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import LibraryModal from './components/LibraryModal';
import { FileData } from '@/lib/extension';
import { ImageGenerateModal } from './components/ImageGenerateModal';
import {
  trackPublishInitiated,
  trackPublishSuccess,
  trackPublishFailed,
  trackPlatformSelected,
} from '@/lib/posthog/events';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

interface ActionPlaceholderProps {
  onClick?: () => void;
  icon: React.ReactNode;
  text: string;
}

const ActionPlaceholder = ({ onClick, icon, text }: ActionPlaceholderProps) => (
  <button
    type="button"
    className={cn(
      'flex aspect-square w-[100px] cursor-pointer flex-col items-center justify-center rounded-2xl transition-all duration-200',
      'bg-default-100 hover:bg-default-200',
      'border border-dashed',
      'text-foreground/60 hover:text-foreground/90',
    )}
    onClick={onClick}>
    {icon}
    <p className="mt-2 text-xs">{text}</p>
  </button>
);

interface SortableMediaProps {
  id: string;
  file: FileData;
  index: number;
  type: 'image' | 'video';
  onDelete: (index: number, type: 'image' | 'video') => void;
  onImageClick?: (index: number) => void;
  onVideoClick?: (url: string) => void;
}

const SortableMedia = ({ id, file, index, type, onDelete, onImageClick, onVideoClick }: SortableMediaProps) => {
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
      className={cn(
        'group relative aspect-square w-[100px] overflow-hidden rounded-2xl',
        'bg-default-100',
        'border',
      )}>
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-50 m-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
        <GripVerticalIcon className="size-4 text-foreground/60" />
      </div>
      {type === 'image' ? (
        <Image
          src={file.url}
          alt={file.name}
          width={100}
          height={100}
          className="cursor-pointer object-cover"
          onClick={() => onImageClick?.(index)}
        />
      ) : (
        <div
          className="size-full cursor-pointer"
          onClick={() => onVideoClick?.(file.url)}>
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
      <Button
        isIconOnly
        size="sm"
        color="danger"
        className="absolute right-0 top-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
        onPress={() => onDelete(index, type)}>
        <XIcon className="size-4" />
      </Button>
    </div>
  );
};

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

interface VideoViewerProps {
  visible: boolean;
  url: string | null;
  onClose: () => void;
}

const VideoViewer = ({ visible, url, onClose }: VideoViewerProps) => {
  if (!visible || !url) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="relative aspect-video w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}>
        <ReactPlayer
          url={url}
          width="100%"
          height="100%"
          controls
          playing
        />
        <Button
          isIconOnly
          size="sm"
          color="danger"
          className="absolute -right-2 -top-8 z-10"
          onPress={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default function DynamicPage() {
  const { t } = useTranslation('publish');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const { dynamicPlatforms, setDynamicPlatforms, clearDynamicPlatforms } = usePlatformStore();
  const isHydrated = useHydration();
  const selectedPlatforms = isHydrated ? dynamicPlatforms : [];
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [videoViewer, setVideoViewer] = useState<{ visible: boolean; url: string | null }>({
    visible: false,
    url: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isVideoDraggingOver, setIsVideoDraggingOver] = useState(false);
  const [isLibraryModalOpen, setLibraryModalOpen] = useState(false);
  const [showDraftAd, setShowDraftAd] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    if (images.some((i) => !i.id)) {
      setImages((current) => current.map((i) => (i.id ? i : { ...i, id: nanoid() })));
    }
  }, [images]);

  useEffect(() => {
    if (videos.some((v) => !v.id)) {
      setVideos((current) => current.map((v) => (v.id ? v : { ...v, id: nanoid() })));
    }
  }, [videos]);

  const steps = [
    {
      id: 1,
      name: t('dynamic.steps.selectType.title', '选择发布类型'),
      description: t('dynamic.steps.selectType.description', '选择您要发布的内容类型'),
    },
    {
      id: 2,
      name: t('dynamic.steps.editContent.title', '内容创作'),
      description: t('dynamic.steps.editContent.description', '撰写内容并添加媒体'),
    },
    {
      id: 3,
      name: t('dynamic.steps.selectAndPublish.title', '选择平台和发布'),
      description: t('dynamic.steps.selectAndPublish.description', '选择账号并进行发布'),
    },
  ];

  const handleStepClick = (stepId: number) => {
    if (stepId === 1) {
      router.push('/dashboard/publish');
    } else if (currentStep > stepId) {
      setCurrentStep(stepId);
    }
  };

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
      const items = type === 'image' ? images : videos;
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      if (type === 'image') {
        setImages((currentItems) => arrayMove(currentItems, oldIndex, newIndex));
      } else {
        setVideos((currentItems) => arrayMove(currentItems, oldIndex, newIndex));
      }
    }
  };

  useEffect(() => {
    const draftData = sessionStorage.getItem('draftData');
    if (draftData) {
      try {
        const parsed = JSON.parse(draftData);
        setTitle(parsed.title || '');
        setContent(parsed.content || '');
        setImages(parsed.images || []);
        setVideos(parsed.videos || []);
        sessionStorage.removeItem('draftData');
      } catch (error) {
        console.error('Failed to parse draft data:', error);
      }
    } else if (process.env.NODE_ENV === 'development') {
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
    clearDynamicPlatforms();
    setAutoPublish(false);
  };

  const handleNextStep = () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired', '内容不能为空'),
        color: 'danger',
      });
      return;
    }
    setCurrentStep(3);
  };

  const handlePrevStep = () => {
    setCurrentStep(2);
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    const current = usePlatformStore.getState().dynamicPlatforms;
    const newSelected = isSelected ? [...current, platform] : current.filter((p) => p !== platform);
    setDynamicPlatforms(newSelected);
    if (newSelected.length > 0) {
      trackPlatformSelected(newSelected, 'dynamic');
    }
  };

  const handlePublish = async () => {
    if (!content) {
      addToast({
        title: t('validation.contentRequired', '内容不能为空'),
        color: 'danger',
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        title: t('validation.platformRequired', '请选择至少一个平台'),
        color: 'danger',
      });
      return;
    }

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

    trackPublishInitiated('dynamic', selectedPlatforms, images.length > 0, videos.length > 0, autoPublish);

    const data = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        images,
        videos,
        tags,
      },
      isAutoPublish: autoPublish,
    };

    const result = await funcPublish(data);
    if (!result.success) {
      trackPublishFailed('dynamic', selectedPlatforms, result.error);
      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
      });
    } else {
      trackPublishSuccess('dynamic', selectedPlatforms, content.length, images.length + videos.length);
      addToast({
        title: t('publish.success', '发布成功'),
        color: 'success',
      });
    }
  };

  const handleExtraConfigChange = (platformKey: string, extraConfig: unknown) => {
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => (platform.name === platformKey ? { ...platform, extraConfig } : platform)),
    );
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleVideoClick = (url: string) => {
    setVideoViewer({ visible: true, url });
  };

  const handleMediaFiles = (files: FileList | null, type: 'image' | 'video') => {
    if (!files) return;

    const newMedia: FileData[] = Array.from(files)
      .filter((file) => file.type.startsWith(`${type}/`))
      .map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        file: file,
      }));

    if (newMedia.length > 0) {
      if (type === 'image') {
        setImages((prevImages) => [...prevImages, ...newMedia]);
      } else {
        setVideos((prevVideos) => [...prevVideos, ...newMedia]);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleMediaFiles(event.target.files, 'image');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleMediaFiles(event.target.files, 'video');
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  // Drag counter refs to handle nested element drag events
  const dragCounterRef = useRef(0);
  const videoDragCounterRef = useRef(0);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    handleMediaFiles(event.dataTransfer.files, 'image');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleVideoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    videoDragCounterRef.current = 0;
    setIsVideoDraggingOver(false);
    handleMediaFiles(event.dataTransfer.files, 'video');
  };

  const handleVideoDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleVideoDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    videoDragCounterRef.current++;
    if (videoDragCounterRef.current === 1) {
      setIsVideoDraggingOver(true);
    }
  };

  const handleVideoDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    videoDragCounterRef.current--;
    if (videoDragCounterRef.current === 0) {
      setIsVideoDraggingOver(false);
    }
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const newImages: FileData[] = [];
    const newVideos: FileData[] = [];

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          newImages.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file),
            file,
          });
        }
      } else if (item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) {
          newVideos.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file),
            file,
          });
        }
      }
    }

    if (newImages.length > 0) {
      setImages((prevImages) => [...prevImages, ...newImages]);
    }
    if (newVideos.length > 0) {
      setVideos((prevVideos) => [...prevVideos, ...newVideos]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const popularPlatformNames = {
    CN: ['DYNAMIC_WEIBO', 'DYNAMIC_WEIXIN', 'DYNAMIC_DOUYIN', 'DYNAMIC_REDNOTE', 'DYNAMIC_BILIBILI'],
    International: ['DYNAMIC_X', 'DYNAMIC_FACEBOOK', 'DYNAMIC_INSTAGRAM', 'DYNAMIC_LINKEDIN'],
  };

  const getPopularPlatforms = (region: 'CN' | 'International') => {
    return platforms.filter(
      (platform) => platform.tags?.includes(region) && popularPlatformNames[region].includes(platform.name),
    );
  };

  const getOtherPlatforms = (region: 'CN' | 'International') => {
    const popularPlatforms = getPopularPlatforms(region);
    const popularPlatformIds = popularPlatforms.map((p) => p.name);

    return platforms.filter(
      (platform) => platform.tags?.includes(region) && !popularPlatformIds.includes(platform.name),
    );
  };

  return (
    <div className="grid grid-cols-1 justify-center gap-6 md:grid-cols-[280px_minmax(0,560px)]">
      <Card className="shadow-none border sticky top-4 h-fit p-6">
        <p className="mb-6 text-lg font-bold text-foreground">{t('dynamic.newTask', '新建发布任务')}</p>
        <div className="flex flex-col gap-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-4 transition-opacity',
                currentStep > step.id ? 'cursor-pointer opacity-100' : 'cursor-default',
                currentStep < step.id && 'opacity-50',
              )}
              onClick={() => {
                if (currentStep > step.id) handleStepClick(step.id);
              }}>
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full font-bold transition-all',
                  step.id === currentStep && 'bg-primary text-primary-foreground',
                  currentStep > step.id && 'bg-default-200 text-foreground',
                  currentStep < step.id && 'bg-default-100 text-foreground/50',
                )}>
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-foreground">{step.name}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {/* Draft feature banner */}
        {showDraftAd && (
          <Card className="shadow-none border mb-4 p-4">
            <div className="flex flex-row items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20">
                <FileTextIcon className="size-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground/90">
                    {t('dynamic.draftAd.title', '试试我们的草稿功能！')}
                  </h4>
                  <StarIcon className="size-4 fill-amber-500 text-amber-500" />
                </div>
                <p className="text-xs text-foreground/50">
                  {t('dynamic.draftAd.description', '保存您的创作进度，随时编辑和发布')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard/drafts">
                  <Button
                    size="sm"
                    color="primary">
                    {t('dynamic.draftAd.tryNow', '立即体验')}
                  </Button>
                </Link>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => setShowDraftAd(false)}
                  className="text-foreground/40 hover:text-foreground/60">
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            {isLibraryModalOpen && (
              <LibraryModal
                isOpen={isLibraryModalOpen}
                onOpenChange={setLibraryModalOpen}
                onSelectImage={async (fileData) => {
                  setImages((prev) => [...prev, fileData]);
                  setLibraryModalOpen(false);
                }}
                existingFiles={images}
              />
            )}
            <ImageGenerateModal
              isOpen={isAiModalOpen}
              onOpenChange={setIsAiModalOpen}
              onImageGenerated={async (fileData) => {
                setImages((prev) => [...prev, { ...fileData, id: nanoid(), type: 'image/png', size: 0 }]);
              }}
              title={title}
              content={content}
            />

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              type="file"
              ref={videoFileInputRef}
              multiple
              accept="video/*"
              className="hidden"
              onChange={handleVideoFileSelect}
            />

            {/* Content card */}
            <Card className="shadow-none border p-6">
              <div className="flex flex-col gap-4">
                <Input
                  isClearable
                  variant="underlined"
                  placeholder={t('dynamic.titlePlaceholder', '给你的内容起个标题（可选）')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onClear={() => setTitle('')}
                  className="w-full"
                  classNames={{
                    input: 'text-foreground/90',
                    inputWrapper: '',
                  }}
                  endContent={<div className="text-xs text-foreground/40">{title.length}</div>}
                />
                <Textarea
                  isClearable
                  isRequired
                  variant="underlined"
                  placeholder={t('dynamic.contentPlaceholder', '在这里输入你的内容...')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onClear={() => setContent('')}
                  fullWidth
                  minRows={5}
                  maxRows={20}
                  autoFocus
                  classNames={{
                    input: 'text-foreground/90',
                    inputWrapper: '',
                  }}
                />
                <HeroTagInput
                  value={tags}
                  onChange={setTags}
                  placeholder={t('dynamic.tags', '添加标签（回车确认）')}
                />
              </div>

              <div className="mt-4 flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href="/docs/user-guide/contact-us"
                    target="_blank">
                    <Button
                      size="sm"
                      variant="bordered">
                      <MessageSquareIcon className="mr-2 size-4" />
                      {t('contactUs', '联系我们')}
                    </Button>
                  </Link>
                  {(title.length > 0 || content.length > 0) && (
                    <Tooltip content={`${t('dynamic.total', 'Total')}: ${title.length + content.length}`}>
                      <div className="flex items-center gap-1 rounded-xl border bg-default-100 px-3 py-1.5">
                        <SigmaIcon className="size-4 text-foreground/60" />
                        <span className="text-sm text-foreground/60">
                          {title.length > 0 && content.length === 0 && title.length}
                          {content.length > 0 && title.length === 0 && content.length}
                          {title.length > 0 && content.length > 0 && `${title.length} + ${content.length}`}
                        </span>
                      </div>
                    </Tooltip>
                  )}
                </div>
                {(title || content || images.length > 0 || videos.length > 0) && (
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                    onPress={handleClearAll}
                    title={t('dynamic.clearAll', '全部清空')}>
                    <TrashIcon className="size-5" />
                  </Button>
                )}
              </div>
            </Card>

            {/* Image upload card */}
            <Card
              className={cn('shadow-none border relative p-4 transition-colors', isDraggingOver && 'ring-2 ring-primary/50')}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, 'image')}>
                <SortableContext
                  items={images.map((file) => file.id!)}
                  strategy={horizontalListSortingStrategy}>
                  <div className="flex flex-row flex-wrap items-center gap-3">
                    {images.map((file, index) => (
                      <SortableMedia
                        key={file.id}
                        id={file.id!}
                        file={file}
                        index={index}
                        type="image"
                        onDelete={handleDeleteFile}
                        onImageClick={handleImageClick}
                      />
                    ))}
                    <ActionPlaceholder
                      onClick={() => fileInputRef.current?.click()}
                      icon={<UploadIcon className="size-6" />}
                      text={t('dynamic.uploadImage', '上传图片')}
                    />
                    <ActionPlaceholder
                      onClick={() => setLibraryModalOpen(true)}
                      icon={<FolderOpenIcon className="size-6" />}
                      text={t('dynamic.library', '素材库')}
                    />
                    <ActionPlaceholder
                      onClick={() => setIsAiModalOpen(true)}
                      icon={<SparklesIcon className="size-6" />}
                      text={t('dynamic.aiGenerate', 'AI 生成')}
                    />
                  </div>
                </SortableContext>
              </DndContext>
              {isDraggingOver && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-primary/20">
                  <UploadIcon className="size-12 text-primary" />
                  <p className="mt-2 font-semibold text-primary">
                    {t('dynamic.releaseToUpload', '松开即可上传')}
                  </p>
                </div>
              )}
            </Card>

            <Viewer
              visible={viewerVisible}
              onClose={() => setViewerVisible(false)}
              images={images.map((file) => ({ src: file.url, alt: file.name }))}
              activeIndex={currentImage}
            />

            {/* Video upload card */}
            <Card
              className={cn('shadow-none border relative p-4 transition-colors', isVideoDraggingOver && 'ring-2 ring-primary/50')}
              onDrop={handleVideoDrop}
              onDragOver={handleVideoDragOver}
              onDragEnter={handleVideoDragEnter}
              onDragLeave={handleVideoDragLeave}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, 'video')}>
                <SortableContext
                  items={videos.map((file) => file.id!)}
                  strategy={horizontalListSortingStrategy}>
                  <div className="flex flex-row flex-wrap items-center gap-3">
                    {videos.map((file, index) => (
                      <SortableMedia
                        key={file.id}
                        id={file.id!}
                        file={file}
                        index={index}
                        type="video"
                        onDelete={handleDeleteFile}
                        onVideoClick={handleVideoClick}
                      />
                    ))}
                    <ActionPlaceholder
                      onClick={() => videoFileInputRef.current?.click()}
                      icon={<PlayCircleIcon className="size-6" />}
                      text={t('dynamic.uploadVideo', '上传视频')}
                    />
                  </div>
                </SortableContext>
              </DndContext>
              <p className="mt-3 text-xs text-red-500/80">
                {t('dynamic.videoSupportWarning', '* 仅少量海外平台支持视频发布，例如 X、Instagram、LinkedIn 等')}
              </p>
              {isVideoDraggingOver && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-primary/20">
                  <UploadIcon className="size-12 text-primary" />
                  <p className="mt-2 font-semibold text-primary">
                    {t('dynamic.releaseToUpload', '松开即可上传')}
                  </p>
                </div>
              )}
            </Card>

            <VideoViewer
              visible={videoViewer.visible}
              url={videoViewer.url}
              onClose={() => setVideoViewer({ visible: false, url: null })}
            />

            <Button
              color="primary"
              className="w-full"
              onPress={handleNextStep}>
              <ArrowRightIcon className="size-5" />
            </Button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <Card className="shadow-none border p-6">
              <div className="mb-4 flex items-center justify-between">
                <Switch
                  isSelected={autoPublish}
                  onValueChange={setAutoPublish}
                  startContent={<BotIcon className="size-4" />}
                  endContent={<HandIcon className="size-4" />}>
                  <span className="text-foreground/80">{t('dynamic.autoPublish', '自动发布')}</span>
                </Switch>
                {selectedPlatforms.length > 0 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={clearDynamicPlatforms}>
                    <Eraser className="size-4" />
                  </Button>
                )}
              </div>

              <Accordion
                isCompact
                variant="light"
                selectionMode="multiple"
                defaultExpandedKeys={['CN', 'International']}>
                <AccordionItem
                  key="CN"
                  title={t('platforms.cn', '中国大陆')}
                  subtitle={`${t('platforms.popular', '热门')}: ${
                    selectedPlatforms.filter((platform) => {
                      const info = getPopularPlatforms('CN').find((p) => p.name === platform);
                      return info;
                    }).length
                  }/${getPopularPlatforms('CN').length}`}
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
                    {getPopularPlatforms('CN').map((platform) => (
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
                  {getOtherPlatforms('CN').length > 0 && (
                    <Accordion
                      isCompact
                      variant="light"
                      className="mt-2"
                      defaultExpandedKeys={
                        getOtherPlatforms('CN').some((p) => selectedPlatforms.includes(p.name)) ? ['CN-Others'] : []
                      }>
                      <AccordionItem
                        key="CN-Others"
                        title={t('platforms.others', '其他')}
                        subtitle={`${
                          selectedPlatforms.filter((platform) => {
                            const info = getOtherPlatforms('CN').find((p) => p.name === platform);
                            return info;
                          }).length
                        }/${getOtherPlatforms('CN').length}`}
                        className="py-1">
                        <div className="grid grid-cols-2 gap-2">
                          {getOtherPlatforms('CN').map((platform) => (
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
                  )}
                </AccordionItem>
                <AccordionItem
                  key="International"
                  title={t('platforms.international', '国际/地区')}
                  subtitle={`${t('platforms.popular', '热门')}: ${
                    selectedPlatforms.filter((platform) => {
                      const info = getPopularPlatforms('International').find((p) => p.name === platform);
                      return info;
                    }).length
                  }/${getPopularPlatforms('International').length}`}
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
                    {getPopularPlatforms('International').map((platform) => (
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
                  {getOtherPlatforms('International').length > 0 && (
                    <Accordion
                      isCompact
                      variant="light"
                      className="mt-2"
                      defaultExpandedKeys={
                        getOtherPlatforms('International').some((p) => selectedPlatforms.includes(p.name))
                          ? ['International-Others']
                          : []
                      }>
                      <AccordionItem
                        key="International-Others"
                        title={t('platforms.others', '其他')}
                        subtitle={`${
                          selectedPlatforms.filter((platform) => {
                            const info = getOtherPlatforms('International').find((p) => p.name === platform);
                            return info;
                          }).length
                        }/${getOtherPlatforms('International').length}`}
                        className="py-1">
                        <div className="grid grid-cols-2 gap-2">
                          {getOtherPlatforms('International').map((platform) => (
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
                  )}
                </AccordionItem>
              </Accordion>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="bordered"
                onPress={handlePrevStep}>
                <ArrowLeftIcon className="size-5" />
              </Button>

              <Button
                color={selectedPlatforms.length === 0 ? 'default' : 'primary'}
                className="flex-1"
                isDisabled={selectedPlatforms.length === 0}
                onPress={handlePublish}>
                <SendHorizontal className="size-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
