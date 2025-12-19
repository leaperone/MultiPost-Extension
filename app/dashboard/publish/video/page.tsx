'use client';

// 为Google Analytics添加类型声明
declare global {
  interface Window {
    gtag: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

// HeroUI版本的TagInput组件
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
        'flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md bg-transparent px-0 py-2 text-sm mt-4',
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
      const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('video/'));
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
            {isDragging ? t('dynamic.tips.drop') : t('video.dragOrClick', 'Click to upload or drag and drop')}
          </p>
        </div>
      </div>
    </div>
  );
};

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
  // Initialize with empty array to prevent hydration mismatch - sync from store after mount
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<CalendarDateTime | null>(null);

  // Platforms that support scheduled publishing
  const scheduleSupportedPlatforms = ['VIDEO_DOUYIN', 'VIDEO_REDNOTE', 'VIDEO_WEIXINCHANNEL', 'VIDEO_KUAISHOU'];

  // Check if any selected platform supports scheduled publishing
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

  const Stepper = () => (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <p className="text-lg font-bold">{t('video.newTask')}</p>
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
    if (videoPlatforms.length > 0) {
      setSelectedPlatforms(videoPlatforms);
    }
  }, []);

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

  // 粘贴上传
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

  // 拖放上传
  const handleFileDrop = useCallback((file: File) => {
    setVideoFile({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
    });
  }, []);

  // input 上传
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

      // 追踪平台选择事件
      if (newSelected.length > 0) {
        trackPlatformSelected(newSelected, 'video');
      }

      // Clear schedule settings if no schedule-supported platforms are selected
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

    // 向Google Analytics发送自定义事件
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

    // 追踪发布发起事件 (PostHog)
    trackPublishInitiated(
      'video',
      selectedPlatforms,
      false, // 视频发布不支持图片
      true, // 有视频
      false, // 视频发布默认不自动发布
    );

    // Convert CalendarDateTime to timestamp if scheduled
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
      // 追踪发布失败事件
      trackPublishFailed('video', selectedPlatforms, result.error);

      addToast({
        title: t('publish.failed', '发布失败'),
        description: result.error || t('publish.unknownError', '未知错误'),
        color: 'danger',
      });
    } else {
      // 追踪发布成功事件
      trackPublishSuccess(
        'video',
        selectedPlatforms,
        content.length,
        1, // 1个视频文件
      );

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
    <div className="grid h-full grid-cols-1 justify-center gap-8 p-4 md:grid-cols-[280px_minmax(0,560px)]">
      <Stepper />
      <div className="overflow-y-auto">
        {currentStep === 2 && (
          <div className="flex flex-col gap-2">
            {/* 视频预览 Card */}
            {videoFile && (
              <Card className="my-2 border bg-default-50 shadow-none">
                <CardBody>
                  <div className="w-full">
                    <div className="group relative mb-2 aspect-video w-full">
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
                    <p className="text-sm text-gray-600">{videoFile.name}</p>
                  </div>
                </CardBody>
                <CardFooter>
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
                        variant="light"
                        onPress={() => coverInputRef.current?.click()}>
                        <ImageIcon className="mr-2 size-5" />
                        {t('video.addCover')}
                      </Button>
                    </>
                  ) : (
                    <div className="w-full">
                      <div
                        className="group relative mb-2 w-full"
                        style={{ paddingTop: '56.25%' }}>
                        <Image
                          src={coverFile.url}
                          alt={coverFile.name}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-lg"
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
                      <p className="text-sm text-gray-600">{coverFile.name}</p>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )}
            {!videoFile ? (
              <Card className="h-fit border bg-default-50 shadow-none">
                <CardHeader>
                  <p className="font-semibold">{t('video.uploadVideoTitle', 'Upload your video')}</p>
                </CardHeader>
                <CardBody>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <DropZone
                    onFileDrop={handleFileDrop}
                    onClick={handleIconClick}
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
                        placeholder={t('video.title')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onClear={() => setTitle('')}
                        className="w-full"
                      />
                      {(title || content || videoFile) && (
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
                  </CardHeader>

                  <CardBody>
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
                    />
                    <HeroTagInput
                      value={tags}
                      onChange={setTags}
                      placeholder={t('video.tags')}
                      className="mt-2"
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
                    subtitle={`$${
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
                    subtitle={`$${
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

            {/* Schedule Publish Options - Only show for supported platforms */}
            {hasScheduleSupportedPlatform && (
              <Card className="border bg-default-50 shadow-none">
                <CardBody className="gap-3">
                  <Checkbox
                    isSelected={scheduleEnabled}
                    onValueChange={setScheduleEnabled}>
                    {t('video.schedulePublish', '定时发布')}
                  </Checkbox>

                  {scheduleEnabled && (
                    <div className="space-y-3">
                      <DatePicker
                        label={t('video.selectPublishTime', '选择发布时间')}
                        value={scheduledDateTime}
                        onChange={setScheduledDateTime}
                        granularity="minute"
                        minValue={now(getLocalTimeZone())}
                        showMonthAndYearPickers
                        hourCycle={24}
                      />

                      {scheduledDateTime && (
                        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
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
                </CardBody>
              </Card>
            )}

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
