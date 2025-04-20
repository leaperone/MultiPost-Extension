'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { VideoIcon, XIcon, ArrowLeftIcon, ArrowRightIcon, SendHorizontal, TrashIcon, Eraser } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { FileData, SyncData } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import { usePlatformStore } from '@/store/publish.store';
import { getPlatformExtraConfigList } from '../action';
import { Icon } from '@iconify/react';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

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
        description: t('validation.titleAndVideoRequired'),
        color: 'danger',
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({
        title: t('validation.platformRequired'),
        description: t('validation.platformRequired'),
        color: 'danger',
      });
      return;
    }

    const data: SyncData = {
      platforms: platforms.filter((platform) => selectedPlatforms.includes(platform.name)),
      data: {
        title,
        content,
        video: videoFile,
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
          <Card className="h-fit bg-default-50 shadow-none">
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
            </CardBody>

            <CardFooter>
              <div className="mb-4 flex w-full items-center justify-between">
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
                    onPress={handleIconClick}>
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
            </CardFooter>
          </Card>

          {/* 视频预览 Card */}
          {videoFile && (
            <Card className="my-2 bg-default-50 shadow-none">
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
          <Card className="mb-4 bg-default-50 shadow-none">
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
