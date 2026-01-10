'use client';

declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import { Button, Input, Textarea, addToast, Accordion, AccordionItem } from '@heroui/react';
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
import {
  LiquidGlassCard,
  LiquidGlassStepper,
  LiquidGlassButton,
  LiquidGlassDropZone,
} from '@/components/ui/liquid-glass';

interface AudioPlayerProps {
  url: string;
  name: string;
  onDelete: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, name, onDelete }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-2xl p-4',
        'bg-white/10 dark:bg-black/20',
        'border border-white/20 dark:border-white/10',
      )}>
      <div className="flex-1">
        <p className="mb-2 text-sm text-foreground/80">{name}</p>
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

export default function PodcastPage() {
  const { t } = useTranslation('publish');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [audio, setAudio] = useState<FileData | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { podcastPlatforms, setPodcastPlatforms, clearPodcastPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  const handleStepClick = (stepId: number) => {
    if (stepId === 1) {
      router.push('/dashboard/publish');
    } else if (currentStep > stepId) {
      setCurrentStep(stepId);
    }
  };

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

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('audio/'));
    if (file) {
      setAudio({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      });
    }
  };

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

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'podcast_publish', {
        event_category: 'publish',
        event_label: selectedPlatforms.join(','),
        platform_count: selectedPlatforms.length,
        audio_name: audio?.name || '',
        auto_publish: autoPublish,
      });
    }

    trackPublishInitiated('podcast', selectedPlatforms, false, false, autoPublish);

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
      trackPublishFailed('podcast', selectedPlatforms, result.error);

      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
      });
    } else {
      trackPublishSuccess('podcast', selectedPlatforms, description.length, 1);

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
    <div className="grid grid-cols-1 justify-center gap-6 md:grid-cols-[280px_minmax(0,560px)]">
      <LiquidGlassStepper
        steps={steps}
        currentStep={currentStep}
        title={t('podcast.newTask')}
        onStepClick={handleStepClick}
      />

      <div className="flex flex-col gap-4">
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            {audio && (
              <LiquidGlassCard className="p-4">
                <AudioPlayer
                  url={audio.url}
                  name={audio.name}
                  onDelete={() => setAudio(null)}
                />
              </LiquidGlassCard>
            )}

            {!audio ? (
              <LiquidGlassCard className="p-6">
                <p className="mb-4 font-semibold text-foreground/90">
                  {t('podcast.uploadAudioTitle', '上传您的音频')}
                </p>
                <input
                  type="file"
                  ref={audioInputRef}
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <LiquidGlassDropZone
                  isDragging={isDraggingOver}
                  icon={<UploadIcon className="size-8" />}
                  text={isDraggingOver ? t('dynamic.tips.drop') : t('podcast.dragOrClick', '点击或拖放音频文件')}
                  onClick={() => audioInputRef.current?.click()}
                  onDrop={handleFileDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                  }}
                />
              </LiquidGlassCard>
            ) : (
              <>
                <LiquidGlassCard className="p-6">
                  <div className="flex w-full items-center justify-between gap-2">
                    <Input
                      isClearable
                      variant="underlined"
                      placeholder={t('podcast.title')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onClear={() => setTitle('')}
                      className="flex-1"
                      classNames={{
                        input: 'text-foreground/90',
                        inputWrapper: 'border-white/20 dark:border-white/10',
                      }}
                    />
                    {(title || description || audio) && (
                      <Button
                        isIconOnly
                        variant="light"
                        color="danger"
                        onPress={handleClearAll}
                        title={t('podcast.clearAll')}>
                        <TrashIcon className="size-5" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    isClearable
                    variant="underlined"
                    placeholder={t('podcast.description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onClear={() => setDescription('')}
                    fullWidth
                    minRows={3}
                    className="mt-4"
                    classNames={{
                      input: 'text-foreground/90',
                      inputWrapper: 'border-white/20 dark:border-white/10',
                    }}
                  />
                </LiquidGlassCard>

                <LiquidGlassButton
                  variant="primary"
                  className="w-full"
                  onClick={handleNextStep}>
                  <ArrowRightIcon className="size-5" />
                </LiquidGlassButton>
              </>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <LiquidGlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between">
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
            </LiquidGlassCard>

            <div className="flex gap-3">
              <LiquidGlassButton
                variant="default"
                onClick={handlePrevStep}>
                <ArrowLeftIcon className="size-5" />
              </LiquidGlassButton>

              <LiquidGlassButton
                variant={selectedPlatforms.length === 0 ? 'default' : 'primary'}
                className="flex-1"
                disabled={selectedPlatforms.length === 0}
                onClick={handlePublish}>
                <SendHorizontal className="size-5" />
              </LiquidGlassButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
