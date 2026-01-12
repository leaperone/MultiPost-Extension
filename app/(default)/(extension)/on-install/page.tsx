'use client';

export interface FileData {
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
  Pin,
  PuzzleIcon,
  SendHorizontal,
  XIcon,
  TrashIcon,
  BotIcon,
  HandIcon,
  Eraser,
  GripVerticalIcon,
  SigmaIcon,
  MessageSquareIcon,
  ImageIcon,
  SparklesIcon,
  LogInIcon,
  ArrowRight,
  VideoIcon,
  PodcastIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  Loader2Icon,
} from 'lucide-react';
import { useTranslation } from '@/i18n/client';
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
  Tooltip,
  Link,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  ButtonGroup,
} from '@heroui/react';
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';

import type { PlatformInfo } from '@/lib/extension';

import { funcPublish, getPlatformInfos, requestRefreshAccountInfo, checkServiceStatus } from '@/lib/extension';
import PlatformCheckbox from '@/app/dashboard/publish/components/PlatformCheckbox';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '@/app/dashboard/publish/action';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => <div>Loading player...</div>,
});

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

const Viewer = dynamic(() => import('react-viewer'), {
  ssr: false,
  loading: () => <div>Loading viewer...</div>,
});

export default function OnInstallPage() {
  const { t } = useTranslation('install');
  const router = useRouter();
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('Hello World from MultiPost');
  const [content, setContent] = useState<string>(
    'My first post via #MultiPost , post your content to multiple platforms with one click',
  );
  const { dynamicPlatforms, setDynamicPlatforms, clearDynamicPlatforms } = usePlatformStore();
  // Initialize with empty array to prevent hydration mismatch - sync from store after mount
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState<boolean>(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [extensionReady, setExtensionReady] = useState<boolean | null>(null);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);

  // Login modal state
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync persisted platform selection after hydration to prevent mismatch
  useEffect(() => {
    if (dynamicPlatforms.length > 0) {
      setSelectedPlatforms(dynamicPlatforms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    requestRefreshAccountInfo().then(() => {});
  }, []);

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
    async function fetchPlatforms() {
      if (process.env.NODE_ENV === 'development') {
        setExtensionReady(true);
        return;
      }

      setIsLoadingPlatforms(true);

      // Check if extension is available with a shorter timeout (3s)
      const isExtensionReady = await checkServiceStatus(3000);
      setExtensionReady(isExtensionReady);

      if (!isExtensionReady) {
        setIsLoadingPlatforms(false);
        return;
      }

      try {
        const [platformData, extraConfigList] = await Promise.all([
          getPlatformInfos('DYNAMIC'),
          getPlatformExtraConfigList(),
        ]);

        if (extraConfigList.success && extraConfigList.data) {
          const extraConfigMap = extraConfigList.data.reduce(
            (acc: Record<string, unknown>, item: { platform: string; data: unknown }) => {
              acc[item.platform] = item.data;
              return acc;
            },
            {} as Record<string, unknown>,
          );

          const platformsWithExtra = platformData.map((platform: PlatformInfo) => ({
            ...platform,
            extraConfig: extraConfigMap[platform.name],
          })) satisfies PlatformInfo[];

          setPlatforms(platformsWithExtra);
        } else {
          setPlatforms(platformData);
        }
      } catch (error) {
        console.error('Failed to fetch platforms:', error);
        setExtensionReady(false);
      } finally {
        setIsLoadingPlatforms(false);
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
    setSelectedPlatforms([]);
    clearDynamicPlatforms();
    setAutoPublish(false);
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
        title: 'Content is required',
        color: 'danger',
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        title: 'Please select at least one platform',
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

    const data = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        images,
        videos,
      },
      isAutoPublish: autoPublish,
    };

    const result = await funcPublish(data);
    if (!result.success) {
      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
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

  // Handle login modal actions
  const handleLibraryClick = () => {
    onOpen();
  };

  const handleAiImageClick = () => {
    onOpen();
  };

  const handleGoToLogin = () => {
    router.push('/dashboard/publish/dynamic');
  };

  // Define popular platforms for each region
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
    <div className="h-full min-h-screen bg-background">
      {/* Extension Instructions */}
      <ExtensionInstructions />

      <div className="container mx-auto max-w-4xl space-y-6 p-6 pt-20">
        {/* Page Title */}
        <div className="mb-8 flex flex-row items-center justify-between">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <Link href="/dashboard/publish/dynamic">
            <Button
              variant="flat"
              color="primary"
              startContent={<ArrowRight className="size-4" />}>
              {t('ui.loginToFullVersion')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ButtonGroup
              variant="flat"
              color="primary">
              <Link href="/dashboard/publish/video">
                <Button>
                  <VideoIcon />
                </Button>
              </Link>
              <Link href="/dashboard/publish/podcast">
                <Button>
                  <PodcastIcon />
                </Button>
              </Link>
            </ButtonGroup>
          </div>
        </div>

        {/* Content Editing Section */}
        <Card className="border bg-default-50 shadow-none">
          <CardHeader>
            <Input
              isClearable
              variant="underlined"
              placeholder={t('ui.titlePlaceholder')}
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
              placeholder={t('ui.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onClear={() => setContent('')}
              fullWidth
              minRows={5}
              autoFocus
            />
          </CardBody>

          <CardFooter>
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Library Modal Placeholder */}
                  <Button
                    variant="flat"
                    color="default"
                    startContent={<ImageIcon className="size-5" />}
                    onPress={handleLibraryClick}>
                    {t('ui.imageLibrary')}
                  </Button>

                  {/* AI Image Generation Placeholder */}
                  <Button
                    variant="flat"
                    color="secondary"
                    startContent={<SparklesIcon className="size-5" />}
                    onPress={handleAiImageClick}>
                    {t('ui.aiGenerate')}
                  </Button>

                  <Link
                    href="/docs/user-guide/contact-us"
                    target="_blank">
                    <Button
                      variant="flat"
                      color="primary"
                      startContent={<MessageSquareIcon className="size-5" />}>
                      {t('ui.contactUs')}
                    </Button>
                  </Link>
                  {(title.length > 0 || content.length > 0) && (
                    <Tooltip content={`${t('ui.total')}: ${title.length + content.length}`}>
                      <Button
                        disableAnimation
                        disableRipple
                        color="default"
                        variant="flat"
                        startContent={<SigmaIcon className="size-5" />}
                        className="flex w-fit cursor-default flex-row items-center gap-1 ">
                        <p className="text-sm text-default-500">
                          {title.length > 0 && content.length === 0 && title.length}
                          {content.length > 0 && title.length === 0 && content.length}
                          {title.length > 0 && content.length > 0 && `${title.length} + ${content.length}`}
                        </p>
                      </Button>
                    </Tooltip>
                  )}
                </div>
                {(title || content || images.length > 0 || videos.length > 0) && (
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                    onPress={handleClearAll}
                    title={t('ui.clearAll')}>
                    <TrashIcon className="size-6" />
                  </Button>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Images Section */}
        {images.length > 0 && (
          <Card className="border bg-default-50 shadow-none">
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

        {/* Videos Section */}
        {videos.length > 0 && (
          <Card className="border bg-default-50 shadow-none">
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

        {/* Extension Status Warning */}
        {extensionReady === false && (
          <Card className="border border-warning-200 bg-warning-50 shadow-none">
            <CardBody>
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-warning" />
                <div className="flex-1">
                  <p className="font-medium text-warning-800">{t('extension.notReady', 'Extension Not Ready')}</p>
                  <p className="mt-1 text-sm text-warning-700">
                    {t(
                      'extension.notReadyDesc',
                      'Please make sure the MultiPost extension is installed and enabled, then refresh the page.',
                    )}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      color="warning"
                      variant="flat"
                      startContent={<RefreshCwIcon className="size-4" />}
                      onPress={() => window.location.reload()}>
                      {t('extension.refresh', 'Refresh Page')}
                    </Button>
                    <Link href="/extension">
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<PuzzleIcon className="size-4" />}>
                        {t('extension.install', 'Install Extension')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingPlatforms && (
          <Card className="border bg-default-50 shadow-none">
            <CardBody>
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2Icon className="size-5 animate-spin text-primary" />
                <span className="text-default-500">{t('extension.loading', 'Loading platforms...')}</span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Platform Selection Section */}
        <Card className="border bg-default-50 shadow-none">
          <CardBody className="gap-2">
            <div className="flex items-center justify-between">
              <Switch
                isSelected={autoPublish}
                onValueChange={setAutoPublish}
                startContent={<BotIcon className="size-4" />}
                endContent={<HandIcon className="size-4" />}>
                {t('firstPost.autoPublish')}
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
                subtitle={`${t('platforms.popular')}: ${
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
                      onChange={(_: unknown, isSelected: boolean) => handlePlatformChange(platform.name, isSelected)}
                      isDisabled={false}
                      onExtraConfigChange={handleExtraConfigChange}
                    />
                  ))}
                </div>
                {getOtherPlatforms('CN').length > 0 && (
                  <Accordion
                    isCompact
                    variant="light"
                    className="mt-2">
                    <AccordionItem
                      key="CN-Others"
                      title={t('platforms.others')}
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
                            onChange={(_: unknown, isSelected: boolean) =>
                              handlePlatformChange(platform.name, isSelected)
                            }
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
                title={t('platforms.international')}
                subtitle={`${t('platforms.popular')}: ${
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
                      onChange={(_: unknown, isSelected: boolean) => handlePlatformChange(platform.name, isSelected)}
                      isDisabled={false}
                      onExtraConfigChange={handleExtraConfigChange}
                    />
                  ))}
                </div>
                {getOtherPlatforms('International').length > 0 && (
                  <Accordion
                    isCompact
                    variant="light"
                    className="mt-2">
                    <AccordionItem
                      key="International-Others"
                      title={t('platforms.others')}
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
                            onChange={(_: unknown, isSelected: boolean) =>
                              handlePlatformChange(platform.name, isSelected)
                            }
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
          </CardBody>
        </Card>

        {/* Publish Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            color={selectedPlatforms.length === 0 ? 'default' : 'primary'}
            disabled={selectedPlatforms.length === 0}
            onPress={handlePublish}
            className="min-w-40"
            startContent={<SendHorizontal />}>
            {t('ui.publish')}
          </Button>
        </div>

        {/* Login Required Modal */}
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          placement="center">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <LogInIcon className="size-5" />
                    {t('ui.loginRequired')}
                  </div>
                </ModalHeader>
                <ModalBody>
                  <p>{t('ui.loginRequiredDesc')}</p>
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="default"
                    variant="light"
                    onPress={onClose}>
                    {t('ui.cancel')}
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleGoToLogin}>
                    {t('ui.goLogin')}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}

const ExtensionInstructions = () => {
  const { t } = useTranslation('install');

  return (
    <div className="fixed right-4 top-20">
      <div className="relative w-[280px] overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-4 shadow-2xl">
        {/* Top Arrow */}
        <div className="absolute -top-2 right-6 size-4 -translate-y-1/2 rotate-45 bg-gradient-to-br from-blue-600 to-purple-600" />

        {/* Corner Arrow */}
        <div className="absolute right-4 top-4 flex size-4 items-center justify-center">
          <div className="relative size-2 rotate-45 border-r border-t border-blue-200/60" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 backdrop-blur" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3 border-b border-white/20 pb-3">
            <PuzzleIcon className="text-blue-200" />
            <p className="text-sm font-medium text-blue-50">{t('instructions.step1')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Pin className="text-blue-200" />
            <p className="text-sm font-medium text-blue-50">{t('instructions.step2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
