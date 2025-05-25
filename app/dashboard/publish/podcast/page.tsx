'use client';

// 为Google Analytics添加类型声明
declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import {
  Card,
  Button,
  Input,
  Textarea,
  CardHeader,
  CardBody,
  CardFooter,
  addToast,
  Accordion,
  AccordionItem,
} from '@heroui/react';
import {
  AudioLinesIcon,
  XIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  Eraser,
  PlayIcon,
  PauseIcon,
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

interface AudioPlayerProps {
  url: string;
  name: string;
  onDelete: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, name, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="group relative flex w-full items-center gap-4 rounded-lg border p-4">
      <Button
        isIconOnly
        variant="light"
        onPress={togglePlay}>
        {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
      </Button>
      <div className="flex-1">
        <p className="text-sm">{name}</p>
        <audio
          ref={audioRef}
          src={url}
          onEnded={() => setIsPlaying(false)}
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
const DropZone = ({ onFileDrop }: { onFileDrop: (file: File) => void }) => {
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

export default function PodcastPage() {
  const { t } = useTranslation('publish');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [audio, setAudio] = useState<FileData | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { podcastPlatforms, setPodcastPlatforms, clearPodcastPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(podcastPlatforms);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

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

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        description,
        audio,
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

  const handleIconClick = () => {
    audioInputRef.current?.click();
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

  return (
    <>
      {currentStep === 1 ? (
        <div className="flex flex-col gap-2">
          <Card className="h-fit border bg-default-50 shadow-none">
            <CardHeader>
              <Input
                isClearable
                variant="underlined"
                placeholder={t('podcast.title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onClear={() => setTitle('')}
                className="w-full"
              />
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

            <CardFooter>
              <div className="mb-4 flex w-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <input
                      type="file"
                      ref={audioInputRef}
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={handleIconClick}
                      disabled={!!audio}
                      className={audio ? 'cursor-not-allowed opacity-50' : ''}>
                      <AudioLinesIcon className="size-8 text-gray-600" />
                    </Button>
                  </div>
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
                {!audio && <DropZone onFileDrop={handleFileDrop} />}
              </div>
            </CardFooter>
          </Card>

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
        </>
      )}
    </>
  );
}
