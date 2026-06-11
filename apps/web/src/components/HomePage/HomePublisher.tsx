'use client';

import { lazy, Suspense, useRef, useEffect, useState, useCallback } from 'react';
import type { Options as ConfettiOptions } from 'canvas-confetti';
import { Link } from '@tanstack/react-router';
import { nanoid } from 'nanoid';
import {
  MessageCircleHeartIcon,
  VideoIcon,
  FileTextIcon,
  PodcastIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SendHorizontal,
  TrashIcon,
  XIcon,
  UploadIcon,
  BotIcon,
  HandIcon,
  Eraser,
  GripVerticalIcon,
  FolderOpenIcon,
  SparklesIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  Image,
  Input,
  Textarea,
  Switch,
  Accordion,
  AccordionItem,
  Spinner,
} from '@heroui/react';
import { addToast } from '@heroui/toast';
import { Icon } from '@iconify/react';
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

import { useExtensionStatus } from '@/hooks/useExtensionStatus';
import { ExtensionGuide } from './ExtensionGuide';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import type { PlatformInfo, FileData } from '@/lib/extension';
import { funcPublish, getPlatformInfos, funcGetPermission } from '@/lib/extension';
import { usePlatformStore } from '@/store/publish.store';
import {
  trackPublishInitiated,
  trackPublishDispatched,
  trackPublishSuccess,
  trackPublishFailed,
  trackPlatformSelected,
} from '@/lib/posthog/events';
import { useSession } from '@/lib/auth-client';
import { useTranslation } from '@/i18n/client';
import { getPlatformExtraConfigList } from '@/actions/publish';
import PlatformCheckbox from '@/routes/dashboard/publish/-components/PlatformCheckbox';
import LibraryModal from '@/routes/dashboard/publish/-components/dynamic/LibraryModal';
import { ImageGenerateModal } from '@/routes/dashboard/publish/-components/dynamic/ImageGenerateModal';
import { interopDefault } from '@/lib/lazyInterop';

const ReactPlayer = lazy(() => import('react-player').then(interopDefault));
const Viewer = lazy(() => import('react-viewer').then(interopDefault));

// canvas-confetti only fires on user-visible milestones; load it on demand so
// it stays out of the homepage's initial chunk.
function fireConfetti(options: ConfettiOptions) {
  void import('canvas-confetti').then(({ default: confetti }) => confetti(options));
}

type PublishType = 'dynamic' | 'video' | 'podcast';

// Popular platform names for each region and type
const popularPlatformNames: Record<PublishType, Record<'CN' | 'International', string[]>> = {
  dynamic: {
    CN: ['DYNAMIC_WEIBO', 'DYNAMIC_WEIXIN', 'DYNAMIC_DOUYIN', 'DYNAMIC_REDNOTE', 'DYNAMIC_BILIBILI'],
    International: ['DYNAMIC_X', 'DYNAMIC_FACEBOOK', 'DYNAMIC_INSTAGRAM', 'DYNAMIC_LINKEDIN'],
  },
  video: {
    CN: ['VIDEO_DOUYIN', 'VIDEO_REDNOTE', 'VIDEO_BILIBILI', 'VIDEO_KUAISHOU', 'VIDEO_WEIXINCHANNEL'],
    International: ['VIDEO_YOUTUBE', 'VIDEO_TIKTOK'],
  },
  podcast: {
    CN: ['PODCAST_XIMALAYA', 'PODCAST_LIZHI'],
    International: [],
  },
};

// Action placeholder button component - same as dashboard/publish/dynamic
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

// Sortable media item component - same as dashboard/publish/dynamic
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
          <Suspense fallback={<div className="size-full animate-pulse bg-default-200" />}>
            <ReactPlayer
              url={file.url}
              width="100%"
              height="100%"
              playing={false}
              controls={false}
              volume={0}
              muted
            />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <VideoIcon className="size-8 text-white" />
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

// Video viewer component
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
        <Suspense fallback={<div className="size-full animate-pulse bg-default-200" />}>
          <ReactPlayer
            url={url}
            width="100%"
            height="100%"
            controls
            playing
          />
        </Suspense>
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

export function HomePublisher() {
  const { t } = useTranslation('home');
  const { t: tPublish } = useTranslation('publish');
  const { isLoading, isInstalled, recheck } = useExtensionStatus();
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;
  const hasShownConfettiRef = useRef(false);

  // Current publish type
  const [publishType, setPublishType] = useState<PublishType>('dynamic');
  // Current step: 1 = content, 2 = platform selection
  const [currentStep, setCurrentStep] = useState(1);

  // Common state
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const [audioFile, setAudioFile] = useState<FileData | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isVideoDraggingOver, setIsVideoDraggingOver] = useState(false);

  // Image viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [videoViewer, setVideoViewer] = useState<{ visible: boolean; url: string | null }>({
    visible: false,
    url: null,
  });

  // Modal state
  const [isLibraryModalOpen, setLibraryModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Platform state
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const { dynamicPlatforms, setDynamicPlatforms, clearDynamicPlatforms } = usePlatformStore();
  const { videoPlatforms, setVideoPlatforms, clearVideoPlatforms } = usePlatformStore();
  const { podcastPlatforms, setPodcastPlatforms, clearPodcastPlatforms } = usePlatformStore();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Show confetti when extension is detected for the first time
  useEffect(() => {
    if (isInstalled && !hasShownConfettiRef.current) {
      hasShownConfettiRef.current = true;
      fireConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#6366f1', '#8b5cf6'],
        disableForReducedMotion: true,
      });
    }
  }, [isInstalled]);

  // Load saved platform selections on mount
  useEffect(() => {
    const savedPlatforms =
      publishType === 'dynamic' ? dynamicPlatforms : publishType === 'video' ? videoPlatforms : podcastPlatforms;
    if (savedPlatforms.length > 0) {
      setSelectedPlatforms(savedPlatforms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishType]);

  // Fetch platforms when type changes
  useEffect(() => {
    if (!isInstalled) return;

    async function fetchPlatforms() {
      setIsLoadingPlatforms(true);
      try {
        await funcGetPermission().catch(() => {});
        const typeMap: Record<PublishType, string> = {
          dynamic: 'DYNAMIC',
          video: 'VIDEO',
          podcast: 'PODCAST',
        };
        const [platformData, extraConfigList] = await Promise.all([
          getPlatformInfos(typeMap[publishType]),
          getPlatformExtraConfigList({ data: {} }),
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
      } catch (error) {
        console.error('Failed to fetch platforms:', error);
      } finally {
        setIsLoadingPlatforms(false);
      }
    }
    fetchPlatforms();
  }, [isInstalled, publishType]);

  // Assign IDs to images without them
  useEffect(() => {
    if (images.some((i) => !i.id)) {
      setImages((current) => current.map((i) => (i.id ? i : { ...i, id: nanoid() })));
    }
  }, [images]);

  // Assign IDs to videos without them
  useEffect(() => {
    if (videos.some((v) => !v.id)) {
      setVideos((current) => current.map((v) => (v.id ? v : { ...v, id: nanoid() })));
    }
  }, [videos]);

  // Sync selected platforms to the corresponding store
  const syncPlatformsToStore = (platforms: string[]) => {
    if (publishType === 'dynamic') {
      setDynamicPlatforms(platforms);
    } else if (publishType === 'video') {
      setVideoPlatforms(platforms);
    } else {
      setPodcastPlatforms(platforms);
    }
  };

  const updateSelectedPlatforms = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
    syncPlatformsToStore(platforms);
  };

  const handlePublishSuccess = () => {
    fireConfetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#10b981', '#14b8a6'],
      disableForReducedMotion: true,
    });
  };

  const handleTypeChange = (type: PublishType) => {
    setPublishType(type);
    setCurrentStep(1);
    // Reset content for new type
    setContent('');
    setTitle('');
    setImages([]);
    setVideos([]);
    setVideoFile(null);
    setAudioFile(null);
    setSelectedPlatforms([]);
  };

  const handleClearAll = () => {
    setContent('');
    setTitle('');
    setImages([]);
    setVideos([]);
    setVideoFile(null);
    setAudioFile(null);
    setSelectedPlatforms([]);
    setAutoPublish(false);
    if (publishType === 'dynamic') clearDynamicPlatforms();
    else if (publishType === 'video') clearVideoPlatforms();
    else clearPodcastPlatforms();
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);
      if (newSelected.length > 0) {
        trackPlatformSelected(newSelected, publishType);
      }
      syncPlatformsToStore(newSelected);
      return newSelected;
    });
  };

  const handleExtraConfigChange = (platformKey: string, extraConfig: unknown) => {
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => (platform.name === platformKey ? { ...platform, extraConfig } : platform)),
    );
  };

  const handleNextStep = () => {
    if (publishType === 'dynamic' && !content.trim()) {
      addToast({ title: tPublish('validation.contentRequired'), color: 'danger' });
      return;
    }
    if (publishType === 'video' && (!title.trim() || !videoFile)) {
      addToast({ title: tPublish('validation.titleAndVideoRequired'), color: 'danger' });
      return;
    }
    if (publishType === 'podcast' && (!title.trim() || !content.trim() || !audioFile)) {
      addToast({ title: tPublish('validation.podcastRequiredFields'), color: 'danger' });
      return;
    }
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      addToast({ title: tPublish('validation.platformRequired'), color: 'danger' });
      return;
    }

    setIsPublishing(true);
    trackPublishInitiated(publishType, selectedPlatforms, images.length > 0, videos.length > 0 || !!videoFile, autoPublish);

    let data: any;
    if (publishType === 'dynamic') {
      data = {
        platforms: platforms.filter((p) => selectedPlatforms.includes(p.name)),
        data: { title, content, images, videos },
        isAutoPublish: autoPublish,
      };
    } else if (publishType === 'video') {
      data = {
        platforms: platforms.filter((p) => selectedPlatforms.includes(p.name)),
        data: { title, content, video: videoFile },
        isAutoPublish: false,
      };
    } else {
      data = {
        platforms: platforms.filter((p) => selectedPlatforms.includes(p.name)),
        data: { title, description: content, audio: audioFile },
        isAutoPublish: autoPublish,
      };
    }

    try {
      trackPublishDispatched(publishType, selectedPlatforms);

      const result = await funcPublish(data);
      if (!result.success) {
        trackPublishFailed(publishType, selectedPlatforms, result.error);
        addToast({
          title: tPublish('publish.failed'),
          description: result.error || tPublish('publish.unknownError'),
          color: 'danger',
        });
      } else {
        trackPublishSuccess(publishType, selectedPlatforms, content.length, images.length);
        addToast({ title: tPublish('publish.success'), color: 'success' });
        handlePublishSuccess();
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // File handling - same as dashboard/publish/dynamic
  const handleMediaFiles = (files: FileList | null, type: 'image' | 'video') => {
    if (!files) return;
    const newMedia: FileData[] = Array.from(files)
      .filter((file) => file.type.startsWith(`${type}/`))
      .map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      }));
    if (newMedia.length > 0) {
      if (type === 'image') setImages((prev) => [...prev, ...newMedia]);
      else setVideos((prev) => [...prev, ...newMedia]);
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

  const handleDeleteFile = (index: number, fileType: 'image' | 'video') => {
    if (fileType === 'image') {
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    } else {
      setVideos((prevVideos) => prevVideos.filter((_, i) => i !== index));
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleVideoClick = (url: string) => {
    setVideoViewer({ visible: true, url });
  };

  // Drag counter refs to handle nested element drag events
  const dragCounterRef = useRef(0);
  const videoDragCounterRef = useRef(0);

  // Drag and drop handlers for images
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

  // Drag and drop handlers for videos
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

  // DnD drag end handler
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

  // Paste handler
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
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
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Video file handling for video publish type
  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
  };

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
  };

  const handleVideoTypeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('video/'));
    if (file) {
      setVideoFile({ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file) });
    }
  };

  const handleAudioTypeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('audio/'));
    if (file) {
      setAudioFile({ name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file) });
    }
  };

  // Platform grouping helpers - same as dashboard/publish/dynamic/page.tsx
  const getPopularPlatforms = (region: 'CN' | 'International') => {
    const popularNames = popularPlatformNames[publishType]?.[region] || [];
    return platforms.filter(
      (platform) => platform.tags?.includes(region) && popularNames.includes(platform.name),
    );
  };

  const getOtherPlatforms = (region: 'CN' | 'International') => {
    const popularPlatforms = getPopularPlatforms(region);
    const popularPlatformIds = popularPlatforms.map((p) => p.name);
    return platforms.filter(
      (platform) => platform.tags?.includes(region) && !popularPlatformIds.includes(platform.name),
    );
  };

  const tabs = [
    { key: 'dynamic' as const, icon: <MessageCircleHeartIcon className="size-5" /> },
    { key: 'video' as const, icon: <VideoIcon className="size-5" /> },
    { key: 'podcast' as const, icon: <PodcastIcon className="size-5" /> },
    { key: 'article' as const, to: '/dashboard/md', icon: <FileTextIcon className="size-5" /> },
  ];

  // Content Step for Dynamic - 完全模仿 dashboard/publish/dynamic/page.tsx
  const renderDynamicContentStep = () => (
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
      {isAiModalOpen && (
        <ImageGenerateModal
          isOpen={isAiModalOpen}
          onOpenChange={setIsAiModalOpen}
          onImageGenerated={async (fileData) => {
            setImages((prev) => [...prev, { ...fileData, id: nanoid(), type: 'image/png', size: 0 }]);
          }}
          title={title}
          content={content}
        />
      )}

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
            placeholder={tPublish('dynamic.titlePlaceholder', '给你的内容起个标题（可选）')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClear={() => setTitle('')}
            className="w-full"
            classNames={{
              input: 'text-foreground/90',
            }}
            endContent={<div className="text-xs text-foreground/40">{title.length}</div>}
          />
          <Textarea
            isClearable
            isRequired
            variant="underlined"
            placeholder={tPublish('dynamic.contentPlaceholder', '在这里输入你的内容...')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onClear={() => setContent('')}
            fullWidth
            minRows={5}
            maxRows={20}
            autoFocus
            classNames={{
              input: 'text-foreground/90',
            }}
          />
        </div>

        {(title || content || images.length > 0 || videos.length > 0) && (
          <div className="mt-4 flex w-full justify-end">
            <Button
              isIconOnly
              variant="light"
              color="danger"
              onPress={handleClearAll}
              title={tPublish('dynamic.clearAll', '全部清空')}>
              <TrashIcon className="size-5" />
            </Button>
          </div>
        )}
      </Card>

      {/* Image upload card - 完全模仿 dashboard/publish/dynamic */}
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
                text={tPublish('dynamic.uploadImage', '上传图片')}
              />
              <ActionPlaceholder
                onClick={() => {
                  if (!session?.user) {
                    addToast({
                      title: t('homePublisher.loginRequired.title') || '需要登录',
                      description: t('homePublisher.loginRequired.description') || '请先登录后才能使用素材库和 AI 生成功能',
                      color: 'warning',
                    });
                    return;
                  }
                  setLibraryModalOpen(true);
                }}
                icon={<FolderOpenIcon className="size-6" />}
                text={tPublish('dynamic.library', '素材库')}
              />
              <ActionPlaceholder
                onClick={() => {
                  if (!session?.user) {
                    addToast({
                      title: t('homePublisher.loginRequired.title') || '需要登录',
                      description: t('homePublisher.loginRequired.description') || '请先登录后才能使用素材库和 AI 生成功能',
                      color: 'warning',
                    });
                    return;
                  }
                  setIsAiModalOpen(true);
                }}
                icon={<SparklesIcon className="size-6" />}
                text={tPublish('dynamic.aiGenerate', 'AI 生成')}
              />
            </div>
          </SortableContext>
        </DndContext>
        {isDraggingOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-primary/20">
            <UploadIcon className="size-12 text-primary" />
            <p className="mt-2 font-semibold text-primary">
              {tPublish('dynamic.releaseToUpload', '松开即可上传')}
            </p>
          </div>
        )}
      </Card>

      {viewerVisible && (
        <Suspense fallback={null}>
          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            images={images.map((file) => ({ src: file.url, alt: file.name }))}
            activeIndex={currentImage}
          />
        </Suspense>
      )}

      <Button color="primary" className="w-full" onClick={handleNextStep}>
        <ArrowRightIcon className="size-5" />
      </Button>
    </div>
  );

  // Content Step for Video
  const renderVideoContentStep = () => (
    <div className="flex flex-col gap-4">
      {!videoFile ? (
        <Card className="shadow-none border p-6">
          <p className="mb-4 font-semibold text-foreground/90">{tPublish('video.uploadVideoTitle')}</p>
          <input type="file" ref={videoFileInputRef} accept="video/*" className="hidden" onChange={handleVideoFileChange} />
          <div
            className={cn(
              'flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300',
              isDraggingOver ? 'border-primary bg-primary/10' : 'hover:bg-default-100',
            )}
            onClick={() => videoFileInputRef.current?.click()}
            onDrop={handleVideoTypeDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}>
            <div className={cn('transition-colors', isDraggingOver ? 'text-primary' : 'text-foreground/40')}>
              <UploadIcon className="size-8" />
            </div>
            <p className={cn('mt-3 text-sm font-medium', isDraggingOver ? 'text-primary' : 'text-foreground/60')}>
              {isDraggingOver ? tPublish('dynamic.tips.drop') : tPublish('video.dragOrClick')}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="shadow-none border relative overflow-hidden p-4">
            <div className="group relative mb-2 aspect-video w-full overflow-hidden rounded-2xl">
              <Suspense fallback={<div className="aspect-video w-full animate-pulse bg-default-200" />}>
                <ReactPlayer
                  url={videoFile.url}
                  width="100%"
                  height="100%"
                  controls
                  playing={false}
                />
              </Suspense>
              <Button isIconOnly size="sm" color="danger" className="absolute right-2 top-2 z-50 opacity-0 transition-opacity group-hover:opacity-100" onPress={() => setVideoFile(null)}>
                <XIcon className="size-4" />
              </Button>
            </div>
            <p className="text-sm text-foreground/60">{videoFile.name}</p>
          </Card>

          <Card className="shadow-none border p-6">
            <div className="flex w-full items-center justify-between gap-2">
              <Input isClearable variant="underlined" placeholder={tPublish('video.title')} value={title} onChange={(e) => setTitle(e.target.value)} onClear={() => setTitle('')} className="flex-1" classNames={{ input: 'text-foreground/90' }} />
              {(title || content || videoFile) && (
                <Button isIconOnly variant="light" color="danger" onPress={handleClearAll}>
                  <TrashIcon className="size-5" />
                </Button>
              )}
            </div>
            <Textarea isClearable variant="underlined" placeholder={tPublish('video.description')} value={content} onChange={(e) => setContent(e.target.value)} onClear={() => setContent('')} fullWidth minRows={3} className="mt-4" classNames={{ input: 'text-foreground/90' }} />
          </Card>

          <Button color="primary" className="w-full" onClick={handleNextStep}>
            <ArrowRightIcon className="size-5" />
          </Button>
        </>
      )}
    </div>
  );

  // Content Step for Podcast
  const renderPodcastContentStep = () => (
    <div className="flex flex-col gap-4">
      {!audioFile ? (
        <Card className="shadow-none border p-6">
          <p className="mb-4 font-semibold text-foreground/90">{tPublish('podcast.uploadAudioTitle')}</p>
          <input type="file" ref={audioFileInputRef} accept="audio/*" className="hidden" onChange={handleAudioFileChange} />
          <div
            className={cn(
              'flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300',
              isDraggingOver ? 'border-primary bg-primary/10' : 'hover:bg-default-100',
            )}
            onClick={() => audioFileInputRef.current?.click()}
            onDrop={handleAudioTypeDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}>
            <div className={cn('transition-colors', isDraggingOver ? 'text-primary' : 'text-foreground/40')}>
              <UploadIcon className="size-8" />
            </div>
            <p className={cn('mt-3 text-sm font-medium', isDraggingOver ? 'text-primary' : 'text-foreground/60')}>
              {isDraggingOver ? tPublish('dynamic.tips.drop') : tPublish('podcast.dragOrClick')}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="shadow-none border p-4">
            <div className="group relative flex w-full items-center gap-4 rounded-2xl bg-default-100 p-4">
              <div className="flex-1">
                <p className="mb-2 text-sm text-foreground/80">{audioFile.name}</p>
                <audio src={audioFile.url} className="w-full" controls />
              </div>
              <Button isIconOnly size="sm" color="danger" className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" onPress={() => setAudioFile(null)}>
                <XIcon className="size-4" />
              </Button>
            </div>
          </Card>

          <Card className="shadow-none border p-6">
            <div className="flex w-full items-center justify-between gap-2">
              <Input isClearable variant="underlined" placeholder={tPublish('podcast.title')} value={title} onChange={(e) => setTitle(e.target.value)} onClear={() => setTitle('')} className="flex-1" classNames={{ input: 'text-foreground/90' }} />
              {(title || content || audioFile) && (
                <Button isIconOnly variant="light" color="danger" onPress={handleClearAll}>
                  <TrashIcon className="size-5" />
                </Button>
              )}
            </div>
            <Textarea isClearable variant="underlined" placeholder={tPublish('podcast.description')} value={content} onChange={(e) => setContent(e.target.value)} onClear={() => setContent('')} fullWidth minRows={3} className="mt-4" classNames={{ input: 'text-foreground/90' }} />
          </Card>

          <Button color="primary" className="w-full" onClick={handleNextStep}>
            <ArrowRightIcon className="size-5" />
          </Button>
        </>
      )}
    </div>
  );

  // Platform Selection Step
  const renderPlatformStep = () => (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none border p-6">
        <div className="mb-4 flex items-center justify-between">
          <Switch
            isSelected={autoPublish}
            onValueChange={setAutoPublish}
            startContent={<BotIcon className="size-4" />}
            endContent={<HandIcon className="size-4" />}>
            <span className="text-foreground/80">{tPublish('dynamic.autoPublish')}</span>
          </Switch>
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

        {isLoadingPlatforms ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
            <span className="ml-2 text-sm text-foreground/60">{t('homePublisher.quickPublish.loadingPlatforms')}</span>
          </div>
        ) : platforms.length === 0 ? (
          <div className="py-4 text-center text-sm text-foreground/60">{t('homePublisher.quickPublish.noPlatforms')}</div>
        ) : (
          <Accordion
            isCompact
            variant="light"
            selectionMode="multiple"
            defaultExpandedKeys={['CN', 'International']}>
            <AccordionItem
              key="CN"
              title={tPublish('platforms.cn')}
              subtitle={`${tPublish('platforms.popular')}: ${
                selectedPlatforms.filter((platform) => {
                  const info = getPopularPlatforms('CN').find((p) => p.name === platform);
                  return info;
                }).length
              }/${getPopularPlatforms('CN').length}`}
              startContent={
                <div className="w-8">
                  <Icon icon="openmoji:flag-china" className="h-max w-full" />
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
                    title={tPublish('platforms.others')}
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
              title={tPublish('platforms.international')}
              subtitle={`${tPublish('platforms.popular')}: ${
                selectedPlatforms.filter((platform) => {
                  const info = getPopularPlatforms('International').find((p) => p.name === platform);
                  return info;
                }).length
              }/${getPopularPlatforms('International').length}`}
              startContent={
                <div className="w-8">
                  <Icon icon="openmoji:globe-with-meridians" className="h-max w-full" />
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
                    title={tPublish('platforms.others')}
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
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="bordered" onClick={handlePrevStep}>
          <ArrowLeftIcon className="size-5" />
        </Button>

        <Button
          color={selectedPlatforms.length === 0 || isPublishing ? 'default' : 'primary'}
          className="flex-1"
          disabled={selectedPlatforms.length === 0 || isPublishing}
          onClick={handlePublish}>
          {isPublishing ? (
            <Spinner size="sm" color="current" />
          ) : (
            <SendHorizontal className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="relative py-8 pt-24">
      <div className="container mx-auto px-4">
        {/* Tabs */}
        <div className="mx-auto mb-6 flex max-w-2xl flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-2xl border p-1">
            {tabs.map((tab) =>
              'to' in tab ? (
                <Link
                  key={tab.key}
                  to={tab.to as never}>
                  <button className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 text-foreground/60 hover:bg-default-100 hover:text-foreground">{tab.icon}</button>
                </Link>
              ) : (
                <button
                  key={tab.key}
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                    publishType === tab.key ? 'bg-default-200 text-foreground shadow-sm' : 'text-foreground/60 hover:bg-default-100 hover:text-foreground',
                  )}
                  onClick={() => handleTypeChange(tab.key as PublishType)}>
                  {tab.icon}
                </button>
              ),
            )}
          </div>

          <Link
            to={'/docs/user-guide/contact-us' as never}
            target="_blank">
            <Button size="sm" variant="bordered">
              <MessageSquareIcon className="mr-2 size-4" />
              {tPublish('contactUs')}
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-2xl">
          {!isInstalled ? (
            <ExtensionGuide isLoading={isLoading} onRecheck={recheck} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${publishType}-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}>
                {currentStep === 1 && (
                  <>
                    {publishType === 'dynamic' && renderDynamicContentStep()}
                    {publishType === 'video' && renderVideoContentStep()}
                    {publishType === 'podcast' && renderPodcastContentStep()}
                  </>
                )}
                {currentStep === 2 && renderPlatformStep()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Tips */}
        <p className="mt-4 text-center text-xs text-foreground/50">{t('homePublisher.quickPublish.tips')}</p>
        <p className="mt-1 text-center text-xs text-foreground/50">
          {t('homePublisher.quickPublish.contactTip')}{' '}
          <Link
            to={'/docs/user-guide/contact-us' as never}
            className="text-primary underline hover:text-primary/80">
            {t('homePublisher.quickPublish.contactUs')}
          </Link>
        </p>
      </div>
    </section>
  );
}
