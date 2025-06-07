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
  SigmaIcon,
  MessageSquareIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
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

import { funcPublish, getPlatformInfos, requestRefreshAccountInfo } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import LibraryModal from './components/LibraryModal';
import { ImageGenerationModal } from './components/ImageGenerationModal';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
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

const Viewer = dynamic(() => import('react-viewer'), { ssr: false });

export default function DynamicPage() {
  const { t } = useTranslation('publish');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
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

    try {
      funcPublish(data);
      console.log('Publishing:', data);
    } catch (error) {
      console.error('Error publishing:', error);
      funcPublish(data);
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

  const handleAiImageGenerated = (newImage: FileData) => {
    setImages((prevImages) => [...prevImages, newImage]);
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
    <>
      {currentStep === 1 ? (
        <div className="flex flex-col gap-2 overflow-y-auto">
          <Card className="h-fit border bg-default-50 shadow-none">
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
              <div className="flex w-full flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <LibraryModal
                      onSelectImage={async (fileData) => {
                        setImages((prev) => [...prev, fileData]);
                      }}
                      existingFiles={images}
                    />
                    <ImageGenerationModal
                      onImageGenerated={handleAiImageGenerated}
                      initialPromptBasis={{ title, content }}
                    />
                    <Button
                      as={Link}
                      href="https://docs.multipost.app/docs/user-guide/contact-us"
                      target="_blank"
                      variant="flat"
                      color="primary"
                      startContent={<MessageSquareIcon className="size-5" />}>
                      {t('contactUs')}
                    </Button>
                    {(title.length > 0 || content.length > 0) && (
                      <Tooltip content={`Total: ${title.length + content.length}`}>
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
                      title={t('dynamic.clearAll')}>
                      <TrashIcon className="size-6" />
                    </Button>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>

          {images.length > 0 && (
            <Card className="my-2 border bg-default-50 shadow-none">
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
            <Card className="my-2 border bg-default-50 shadow-none">
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
          <Card className="mb-4 border bg-default-50 shadow-none">
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
