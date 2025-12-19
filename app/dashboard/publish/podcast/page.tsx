'use client';

// 为Google Analytics添加类型声明
declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import { Card, Button, Input, Textarea, CardHeader, CardBody, addToast, Accordion, AccordionItem } from '@heroui/react';
import {
  XIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  Eraser,
  UploadIcon,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/client';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

import type { PlatformInfo } from '@/lib/extension';
import type { FileData, SyncData } from '@/lib/extension';

import { funcPublish, getPlatformInfos } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import { useRouter } from 'next/navigation';
import {
  trackPublishInitiated,
  trackPublishSuccess,
  trackPublishFailed,
  trackPlatformSelected,
} from '@/lib/posthog/events';

interface AudioPlayerProps {
  url: string;
  name: string;
  onDelete: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, name, onDelete }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="group relative flex w-full items-center gap-4 rounded-lg border p-4">
      <div className="flex-1">
        <p className="text-sm">{name}</p>
        <audio
          ref={audioRef}
          src={url}
          className="w-full"
          controls
        />
      </div>
      <Button
        isIconOnly
        size="sm"
        color="danger"
        className="absolute right-2 top-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
        onPress={onDelete}>
        <XIcon className="size-4" />
      </Button>
    </div>
  );
};

// 拖放区域组件
const DropZone = ({ onFileDrop, onClick }: { onFileDrop: (file: File) => void; onClick: () => void }) => {
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
      const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('audio/'));
      if (file) {
        onFileDrop(file);
      }
    },
    [onFileDrop],
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
      onDrop={handleDrop}
      onClick={onClick}>
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <UploadIcon className={cn('size-8', isDragging ? 'text-primary' : 'text-gray-500')} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {isDragging ? t('dynamic.tips.drop') : t('podcast.dragOrClick', 'Click to upload or drag and drop')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function PodcastPage() {
  const { t } = useTranslation('publish');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [audio, setAudio] = useState<FileData | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { podcastPlatforms, setPodcastPlatforms, clearPodcastPlatforms } = usePlatformStore();
  // Initialize with empty array to prevent hydration mismatch - sync from store after mount
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  const steps = [
    {
      id: 1,
      name: t('dynamic.steps.selectType.title'),
      description: t('dynamic.steps.selectType.description'),
    },
    {
      id: 2,
      name: t('podcast.steps.editContent.title'),
      description: t('podcast.steps.editContent.description'),
    },
    {
      id: 3,
      name: t('dynamic.steps.selectAndPublish.title'),
      description: t('dynamic.steps.selectAndPublish.description'),
    },
  ];

  const Stepper = () => (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <p className="text-lg font-bold">{t('podcast.newTask')}</p>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn('flex items-start gap-4', currentStep > step.id ? 'cursor-pointer' : 'cursor-default')}
              onClick={() => {
                if (step.id === 1) {
                  router.push('/dashboard/publish');
                } else if (currentStep > step.id) {
                  setCurrentStep(step.id);
                }
              }}>
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold transition-colors',
                  step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-default-200 text-default-foreground',
                  currentStep > step.id && 'bg-primary/20 text-primary',
                )}>
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{step.name}</p>
                <p className="text-sm text-default-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );

  // Sync persisted platform selection after hydration to prevent mismatch
  useEffect(() => {
    if (podcastPlatforms.length > 0) {
      setSelectedPlatforms(podcastPlatforms);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('Development podcast title');
      setDescription('Development podcast description');
    }
  }, []);

  useEffect(() => {
    async function fetchPlatforms() {
      const [platformData, extraConfigList] = await Promise.all([
        getPlatformInfos('PODCAST'),
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

  // 粘贴上传
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('audio/')) {
        const file = item.getAsFile();
        if (file) {
          setAudio({
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            size: file.size,
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // 拖放上传
  const handleFileDrop = useCallback((file: File) => {
    setAudio({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
    });
  }, []);

  // input 上传
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setAudio({
        name: selectedFile.name,
        url: URL.createObjectURL(selectedFile),
        type: selectedFile.type,
        size: selectedFile.size,
      });
    }
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);

      // 追踪平台选择事件
      if (newSelected.length > 0) {
        trackPlatformSelected(newSelected, 'podcast');
      }

      return newSelected;
    });
  };

  useEffect(() => {
    setPodcastPlatforms(selectedPlatforms);
  }, [selectedPlatforms, setPodcastPlatforms]);

  const handlePublish = async () => {
    if (!audio) {
      addToast({
        title: t('validation.audioRequired'),
        color: 'danger',
      });
      return;
    }
    if (!title || !description) {
      addToast({
        title: t('validation.titleAndDescriptionRequired'),
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
      window.gtag('event', 'podcast_publish', {
        event_category: 'publish',
        event_label: selectedPlatforms.join(','),
        platform_count: selectedPlatforms.length,
        audio_name: audio?.name || '',
        auto_publish: autoPublish,
      });
    }

    // 追踪发布发起事件 (PostHog)
    trackPublishInitiated(
      'podcast',
      selectedPlatforms,
      false, // 播客发布不支持图片
      false, // 播客发布不支持视频
      autoPublish,
    );

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        description,
        audio,
      },
      isAutoPublish: autoPublish,
    };

    const result = await funcPublish(data);
    if (!result.success) {
      // 追踪发布失败事件
      trackPublishFailed('podcast', selectedPlatforms, result.error);

      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
      });
    } else {
      // 追踪发布成功事件
      trackPublishSuccess(
        'podcast',
        selectedPlatforms,
        description.length,
        1, // 1个音频文件
      );

      addToast({
        title: t('publish.success', '发布成功'),
        color: 'success',
      });
    }
  };

  const handleClearAll = () => {
    setAudio(null);
    setTitle('');
    setDescription('');
    setSelectedPlatforms([]);
    clearPodcastPlatforms();
    setAutoPublish(false);
  };

  const handleNextStep = () => {
    if (!audio || !title || !description) {
      addToast({
        title: t('validation.podcastRequiredFields'),
        color: 'danger',
      });
      return;
    }
    setCurrentStep(3);
  };

  const handlePrevStep = () => {
    setCurrentStep(2);
  };

  const handleExtraConfigChange = (platformKey: string, extraConfig: unknown) => {
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => (platform.name === platformKey ? { ...platform, extraConfig } : platform)),
    );
  };

  return (
    <div className="grid h-full grid-cols-1 justify-center gap-8 p-4 md:grid-cols-[280px_minmax(0,560px)]">
      <Stepper />
      <div className="overflow-y-auto">
        {currentStep === 2 && (
          <div className="flex flex-col gap-2">
            {audio && (
              <Card className="my-2 border bg-default-50 shadow-none">
                <CardBody>
                  <AudioPlayer
                    url={audio.url}
                    name={audio.name}
                    onDelete={() => setAudio(null)}
                  />
                </CardBody>
              </Card>
            )}
            {!audio ? (
              <Card className="h-fit border bg-default-50 shadow-none">
                <CardHeader>
                  <p className="font-semibold">{t('podcast.uploadAudioTitle', 'Upload your audio')}</p>
                </CardHeader>
                <CardBody>
                  <input
                    type="file"
                    ref={audioInputRef}
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <DropZone
                    onFileDrop={handleFileDrop}
                    onClick={() => audioInputRef.current?.click()}
                  />
                </CardBody>
              </Card>
            ) : (
              <>
                <Card className="h-fit border bg-default-50 shadow-none">
                  <CardHeader>
                    <div className="flex w-full items-center justify-between gap-2">
                      <Input
                        isClearable
                        variant="underlined"
                        placeholder={t('podcast.title')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onClear={() => setTitle('')}
                        className="w-full"
                      />
                      {(title || description || audio) && (
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          onPress={handleClearAll}
                          title={t('podcast.clearAll')}>
                          <TrashIcon className="size-6" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardBody className="gap-4">
                    <Textarea
                      isClearable
                      variant="underlined"
                      placeholder={t('podcast.description')}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onClear={() => setDescription('')}
                      fullWidth
                      minRows={3}
                    />
                  </CardBody>
                </Card>

                <Button
                  fullWidth
                  onPress={handleNextStep}>
                  <ArrowRightIcon />
                </Button>
              </>
            )}
          </div>
        )}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <Card className="mb-4 border bg-default-50 shadow-none">
              <CardBody className="gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
