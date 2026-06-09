declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import { Button, Input, Textarea, addToast, Accordion, AccordionItem, Card } from '@heroui/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  XIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  Eraser,
  UploadIcon,
  ImageIcon,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/client';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

import type { PlatformInfo } from '@/lib/extension';
import type { FileData, SyncData } from '@/lib/extension';

import { funcPublish, getPlatformInfos } from '@/lib/extension';
import PlatformCheckbox from './-components/PlatformCheckbox';
import HeroTagInput from './-components/HeroTagInput';
import { useHydration } from '@/hooks/useHydration';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../../../actions/publish';
import {
  trackPublishInitiated,
  trackPublishDispatched,
  trackPublishSuccess,
  trackPublishFailed,
  trackPlatformSelected,
} from '@/lib/posthog/events';

export const Route = createFileRoute('/dashboard/publish/podcast')({
  component: PodcastPage,
});

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
        'bg-default-100',
        'border',
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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [audio, setAudio] = useState<FileData | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { podcastPlatforms, setPodcastPlatforms, clearPodcastPlatforms } = usePlatformStore();
  const isHydrated = useHydration();
  const selectedPlatforms = isHydrated ? podcastPlatforms : [];
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [coverFile, setCoverFile] = useState<FileData | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setCoverFile({
        name: selectedFile.name,
        url: URL.createObjectURL(selectedFile),
        type: selectedFile.type,
        size: selectedFile.size,
      });
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

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
      void navigate({ to: '/dashboard/publish' });
    } else if (currentStep > stepId) {
      setCurrentStep(stepId);
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('Development podcast title');
      setDescription('Development podcast description');
    }
  }, []);

  useEffect(() => {
    async function fetchPlatforms() {
      try {
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
      } catch (error) {
        console.warn('fetchPlatforms (podcast) failed:', error);
        setPlatforms([]);
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
    const current = usePlatformStore.getState().podcastPlatforms;
    const newSelected = isSelected ? [...current, platform] : current.filter((p) => p !== platform);
    setPodcastPlatforms(newSelected);

    if (newSelected.length > 0) {
      trackPlatformSelected(newSelected, 'podcast');
    }
  };

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
        cover: coverFile || undefined,
        tags,
        category: category || undefined,
      },
      isAutoPublish: autoPublish,
    };

    trackPublishDispatched('podcast', selectedPlatforms);

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
    handleRemoveCover();
    setTags([]);
    setCategory('');
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
      <Card className="shadow-none border sticky top-4 h-fit p-6">
        <p className="mb-6 text-lg font-bold text-foreground">{t('podcast.newTask')}</p>
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
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            {audio && (
              <Card className="shadow-none border p-4">
                <AudioPlayer
                  url={audio.url}
                  name={audio.name}
                  onDelete={() => setAudio(null)}
                />
              </Card>
            )}

            {!audio ? (
              <Card className="shadow-none border p-6">
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
                <div
                  className={cn(
                    'flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300',
                    isDraggingOver ? 'border-primary bg-primary/10' : 'hover:bg-default-100',
                  )}
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
                  }}>
                  <div className={cn('transition-colors', isDraggingOver ? 'text-primary' : 'text-foreground/40')}>
                    <UploadIcon className="size-8" />
                  </div>
                  <p className={cn('mt-3 text-sm font-medium', isDraggingOver ? 'text-primary' : 'text-foreground/60')}>
                    {isDraggingOver ? t('dynamic.tips.drop') : t('podcast.dragOrClick', '点击或拖放音频文件')}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <Card className="shadow-none border p-6">
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
                    }}
                  />

                  <HeroTagInput
                    value={tags}
                    onChange={setTags}
                    placeholder={t('podcast.tags', '添加标签（回车确认）')}
                  />

                  <div className="mt-4 flex flex-col gap-3">
                    <Input
                      isClearable
                      variant="underlined"
                      placeholder={t('podcast.category', '分类（平台 ID 或名称）')}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      onClear={() => setCategory('')}
                      classNames={{ input: 'text-foreground/90' }}
                    />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-foreground/70">{t('podcast.cover', '封面')}</p>
                      {!coverFile ? (
                        <>
                          <input
                            type="file"
                            ref={coverInputRef}
                            accept="image/*"
                            onChange={handleCoverFileChange}
                            className="hidden"
                          />
                          <Button
                            variant="bordered"
                            size="sm"
                            onPress={() => coverInputRef.current?.click()}>
                            <ImageIcon className="mr-2 size-4" />
                            {t('podcast.uploadCover', '上传封面')}
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-2 text-sm text-foreground/60">
                          <span className="truncate">{coverFile.name}</span>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={handleRemoveCover}>
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Button
                  color="primary"
                  className="w-full"
                  onPress={handleNextStep}>
                  <ArrowRightIcon className="size-5" />
                </Button>
              </>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <Card className="shadow-none border p-6">
              <div className="mb-4 flex items-center justify-between">
                {selectedPlatforms.length > 0 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={clearPodcastPlatforms}>
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
            </Card>

            <div className="flex gap-3">
              <Button
                variant="bordered"
                onPress={handlePrevStep}>
                <ArrowLeftIcon className="size-5" />
              </Button>

              <Button
                color={selectedPlatforms.length === 0 ? undefined : 'primary'}
                variant={selectedPlatforms.length === 0 ? 'bordered' : undefined}
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
