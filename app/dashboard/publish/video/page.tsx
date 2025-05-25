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
} from '@heroui/react';
import {
  VideoIcon,
  XIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendHorizontal,
  TrashIcon,
  Eraser,
  UploadIcon,
  PlusIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { FileData, SyncData } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

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
            title="添加标签">
            <PlusIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
HeroTagInput.displayName = 'HeroTagInput';

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

export default function VideoPage() {
  const { t } = useTranslation('publish');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoPlatforms, setVideoPlatforms, clearVideoPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(videoPlatforms);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [tags, setTags] = useState<string[]>([]);

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
    setTitle('');
    setContent('');
    setSelectedPlatforms([]);
    clearVideoPlatforms();
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => {
      const newSelected = isSelected ? [...prev, platform] : prev.filter((p) => p !== platform);
      setVideoPlatforms(newSelected);
      return newSelected;
    });
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

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        video: videoFile,
        tags,
      },
      isAutoPublish: false,
    };

    funcPublish(data);
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
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
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
                placeholder={t('video.title')}
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

            <CardFooter>
              <div className="mb-4 flex w-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      isIconOnly
                      variant="light"
                      onPress={handleIconClick}
                      disabled={!!videoFile}
                      className={videoFile ? 'cursor-not-allowed opacity-50' : ''}>
                      <VideoIcon className="size-8 text-gray-600" />
                    </Button>
                  </div>
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
                {!videoFile && <DropZone onFileDrop={handleFileDrop} />}
              </div>
            </CardFooter>
          </Card>

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
