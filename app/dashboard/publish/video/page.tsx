'use client';

declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Textarea,
  addToast,
  Accordion,
  AccordionItem,
  Chip,
  DatePicker,
  Checkbox,
} from '@heroui/react';
import {
  XIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  TrashIcon,
  Eraser,
  UploadIcon,
  PlusIcon,
  ImageIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { FileData, SyncData } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { CalendarDateTime, now, getLocalTimeZone } from '@internationalized/date';
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

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

const HeroTagInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
  }
>(({ value, onChange, placeholder, className, ...props }, ref) => {
  const { t } = useTranslation('publish');

  const [inputValue, setInputValue] = React.useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const addTag = () => {
    const newTag = inputValue.trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className={cn(
        'mt-4 flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md bg-transparent px-0 py-2 text-sm',
        className,
      )}>
      {value.map((tag) => (
        <Chip
          key={tag}
          size="sm"
          variant="flat"
          color="primary"
          onClose={() => removeTag(tag)}
          className="text-sm">
          {tag}
        </Chip>
      ))}
      <div className="flex flex-1 items-center">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="underlined"
          className="flex-1 px-0"
          placeholder={value.length === 0 ? placeholder : ''}
          classNames={{
            input: 'text-foreground/90',
            inputWrapper: 'border-white/20 dark:border-white/10',
          }}
          {...props}
        />
        {inputValue.trim() && (
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={addTag}
            title={t('video.addTag', '添加标签')}>
            <PlusIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
HeroTagInput.displayName = 'HeroTagInput';

export default function VideoPage() {
  const { t } = useTranslation('publish');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const [coverFile, setCoverFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { videoPlatforms, setVideoPlatforms, clearVideoPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<CalendarDateTime | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const scheduleSupportedPlatforms = ['VIDEO_DOUYIN', 'VIDEO_REDNOTE', 'VIDEO_WEIXINCHANNEL', 'VIDEO_KUAISHOU'];

  const hasScheduleSupportedPlatform = selectedPlatforms.some((platform) =>
    scheduleSupportedPlatforms.includes(platform),
  );

  const steps = [
    {
      id: 1,
      name: t('dynamic.steps.selectType.title'),
      description: t('dynamic.steps.selectType.description'),
    },
    {
      id: 2,
      name: t('video.steps.editContent.title'),
      description: t('video.steps.editContent.description'),
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
    if (videoPlatforms.length > 0) {
      setSelectedPlatforms(videoPlatforms);
    }
  }, [videoPlatforms]);

  useEffect(() => {
    async function fetchPlatforms() {
      const [platformData, extraConfigList] = await Promise.all([
        getPlatformInfos('VIDEO'),
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
        }));

        setPlatforms(platformsWithExtra);
      } else {
        setPlatforms(platformData);
      }
    }
    fetchPlatforms();
  }, []);

  const handleExtraConfigChange = (platformKey: string, extraConfig: unknown) => {
    setPlatforms((prevPlatforms) =>
      prevPlatforms.map((platform) => (platform.name === platformKey ? { ...platform, extraConfig } : platform)),
    );
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) {
          setVideoFile({
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
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('video/'));
    if (file) {
      setVideoFile({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setVideoFile({
        name: selectedFile.name,
        url: URL.createObjectURL(selectedFile),
        type: selectedFile.type,
        size: selectedFile.size,
      });
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCoverFile(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
    setTitle('');
    setContent('');
    setSelectedPlatforms([]);
    clearVideoPlatforms();
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);
      setVideoPlatforms(newSelected);

      if (newSelected.length > 0) {
        trackPlatformSelected(newSelected, 'video');
      }

      const hasScheduleSupport = newSelected.some((p) => scheduleSupportedPlatforms.includes(p));
      if (!hasScheduleSupport) {
        setScheduleEnabled(false);
        setScheduledDateTime(null);
      }

      return newSelected;
    });
  };

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
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!title || !videoFile) {
      addToast({
        title: t('validation.titleAndVideoRequired'),
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
      window.gtag('event', 'video_publish', {
        event_category: 'publish',
        event_label: selectedPlatforms.join(','),
        platform_count: selectedPlatforms.length,
        has_description: content.trim().length > 0,
        video_name: videoFile?.name || '',
        auto_publish: false,
      });
    }

    trackPublishInitiated('video', selectedPlatforms, false, true, false);

    let scheduledPublishTime: number | undefined = undefined;
    if (scheduleEnabled && scheduledDateTime) {
      const scheduledDate = new Date(
        scheduledDateTime.year,
        scheduledDateTime.month - 1,
        scheduledDateTime.day,
        scheduledDateTime.hour,
        scheduledDateTime.minute,
        scheduledDateTime.second || 0,
      );
      scheduledPublishTime = scheduledDate.getTime();
    }

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        video: videoFile,
        cover: coverFile || undefined,
        tags,
        scheduledPublishTime,
      },
      isAutoPublish: false,
    };

    const result = await funcPublish(data);
    if (!result.success) {
      trackPublishFailed('video', selectedPlatforms, result.error);

      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
      });
    } else {
      trackPublishSuccess('video', selectedPlatforms, content.length, 1);

      addToast({
        title: t('publish.success', '发布成功'),
        color: 'success',
      });
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleNextStep = () => {
    if (!title || !videoFile) {
      addToast({
        title: t('validation.titleAndVideoRequired'),
        color: 'danger',
      });
      return;
    }
    setCurrentStep(3);
  };

  const handlePrevStep = () => {
    setCurrentStep(2);
  };

  return (
    <div className="grid grid-cols-1 justify-center gap-6 md:grid-cols-[280px_minmax(0,560px)]">
      <LiquidGlassStepper
        steps={steps}
        currentStep={currentStep}
        title={t('video.newTask')}
        onStepClick={handleStepClick}
      />

      <div className="flex flex-col gap-4">
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            {videoFile && (
              <LiquidGlassCard className="relative overflow-hidden p-4">
                <div className="group relative mb-2 aspect-video w-full overflow-hidden rounded-2xl">
                  <ReactPlayer
                    url={videoFile.url}
                    width="100%"
                    height="100%"
                    controls
                    playing={false}
                  />
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    className="absolute right-2 top-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
                    onPress={handleRemoveVideo}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <p className="text-sm text-foreground/60">{videoFile.name}</p>

                <div className="mt-4">
                  {!coverFile ? (
                    <>
                      <input
                        type="file"
                        ref={coverInputRef}
                        accept="image/*"
                        onChange={handleCoverFileChange}
                        className="hidden"
                      />
                      <LiquidGlassButton
                        variant="default"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}>
                        <ImageIcon className="mr-2 size-4" />
                        {t('video.addCover')}
                      </LiquidGlassButton>
                    </>
                  ) : (
                    <div className="w-full">
                      <div
                        className="group relative mb-2 w-full overflow-hidden rounded-xl"
                        style={{ paddingTop: '56.25%' }}>
                        <Image
                          src={coverFile.url}
                          alt={coverFile.name}
                          fill
                          className="rounded-xl object-cover"
                        />
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          className="absolute right-2 top-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
                          onPress={handleRemoveCover}>
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/60">{coverFile.name}</p>
                    </div>
                  )}
                </div>
              </LiquidGlassCard>
            )}

            {!videoFile ? (
              <LiquidGlassCard className="p-6">
                <p className="mb-4 font-semibold text-foreground/90">{t('video.uploadVideoTitle', '上传您的视频')}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <LiquidGlassDropZone
                  isDragging={isDraggingOver}
                  icon={<UploadIcon className="size-8" />}
                  text={isDraggingOver ? t('dynamic.tips.drop') : t('video.dragOrClick', '点击或拖放视频文件')}
                  onClick={handleIconClick}
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
                      placeholder={t('video.title')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onClear={() => setTitle('')}
                      className="flex-1"
                      classNames={{
                        input: 'text-foreground/90',
                        inputWrapper: 'border-white/20 dark:border-white/10',
                      }}
                    />
                    {(title || content || videoFile) && (
                      <Button
                        isIconOnly
                        variant="light"
                        color="danger"
                        onPress={handleClearAll}
                        title={t('dynamic.clearAll')}>
                        <TrashIcon className="size-5" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    isClearable
                    variant="underlined"
                    placeholder={t('video.description')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onClear={() => setContent('')}
                    fullWidth
                    minRows={5}
                    autoFocus
                    className="mt-4"
                    classNames={{
                      input: 'text-foreground/90',
                      inputWrapper: 'border-white/20 dark:border-white/10',
                    }}
                  />

                  <HeroTagInput
                    value={tags}
                    onChange={setTags}
                    placeholder={t('video.tags')}
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

            {hasScheduleSupportedPlatform && (
              <LiquidGlassCard className="p-6">
                <Checkbox
                  isSelected={scheduleEnabled}
                  onValueChange={setScheduleEnabled}>
                  <span className="text-foreground/80">{t('video.schedulePublish', '定时发布')}</span>
                </Checkbox>

                {scheduleEnabled && (
                  <div className="mt-4 space-y-3">
                    <DatePicker
                      label={t('video.selectPublishTime', '选择发布时间')}
                      value={scheduledDateTime as any}
                      onChange={setScheduledDateTime as any}
                      granularity="minute"
                      minValue={now(getLocalTimeZone()) as any}
                      showMonthAndYearPickers
                      hourCycle={24}
                    />

                    {scheduledDateTime && (
                      <div className="rounded-xl bg-blue-500/10 p-3">
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {t('video.scheduledTime', '计划发布时间')}: {scheduledDateTime.year}-
                          {String(scheduledDateTime.month).padStart(2, '0')}-
                          {String(scheduledDateTime.day).padStart(2, '0')}{' '}
                          {String(scheduledDateTime.hour).padStart(2, '0')}:
                          {String(scheduledDateTime.minute).padStart(2, '0')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </LiquidGlassCard>
            )}

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
