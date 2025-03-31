'use client';

import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter, Switch } from '@heroui/react';
import {
  ImagePlusIcon,
  VideoIcon,
  XIcon,
  TrashIcon,
  BotIcon,
  HandIcon,
  SendIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from 'react';
import Viewer from 'react-viewer';
import { useTranslation } from '@/i18n/client';

import type { PlatformInfo } from '@/lib/extension';
import type { FileData, SyncData } from '@/lib/extension';

import { funcPublish, getPlatformInfos } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { usePlatformStore } from '@/store/publish.store';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

export default function DynamicPage() {
  const { t } = useTranslation('publish');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { dynamicPlatforms, setDynamicPlatforms, clearDynamicPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(dynamicPlatforms);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('Development title');
      setContent('Development content');
    }
  }, []);

  useEffect(() => {
    async function fetchPlatforms() {
      const platformData = await getPlatformInfos('DYNAMIC');
      setPlatforms(platformData);
    }
    fetchPlatforms();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: FileData[] = Array.from(selectedFiles)
        .filter((file) => file.type.startsWith(`${fileType}/`))
        .map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        }));
      if (fileType === 'image') {
        setImages((prevImages) => [...prevImages, ...newFiles]);
      } else {
        setVideos((prevVideos) => [...prevVideos, ...newFiles]);
      }
    }
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
      console.log(t('validation.contentRequired'));
      alert(t('validation.contentRequired'));
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log(t('validation.platformRequired'));
      alert(t('validation.platformRequired'));
      return;
    }

    const data: SyncData = {
      platforms: selectedPlatforms,
      data: {
        title,
        content,
        images,
        videos,
      },
      auto_publish: autoPublish,
    };

    try {
      funcPublish(data);
    } catch (error) {
      console.error('Error publishing:', error);
      funcPublish(data);
    }
  };

  const handleIconClick = (type: 'image' | 'video') => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      videoInputRef.current?.click();
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

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
      alert(t('validation.contentRequired'));
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
        <>
          <Card className="h-fit bg-default-50 shadow-none">
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
              <div className="mb-4 flex w-full items-center justify-between">
                <div className="flex">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'image')}
                    className="hidden"
                    multiple
                  />
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => handleIconClick('image')}>
                    <ImagePlusIcon className="size-8 text-gray-600" />
                  </Button>
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    onChange={(e) => handleFileChange(e, 'video')}
                    className="hidden"
                    multiple
                  />
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => handleIconClick('video')}>
                    <VideoIcon className="size-8 text-gray-600" />
                  </Button>
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
            </CardFooter>
          </Card>

          {/* 图片预览 Card */}
          {images.length > 0 && (
            <Card className="my-2 bg-default-50 shadow-none">
              <CardBody className="flex flex-row flex-wrap items-center justify-center gap-2">
                {images.map((file, index) => (
                  <div
                    key={index}
                    className="group relative">
                    <Image
                      src={file.url}
                      alt={file.name}
                      width={100}
                      height={100}
                      className="cursor-pointer rounded-md object-cover"
                      onClick={() => handleImageClick(index)}
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      className="absolute right-0 top-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onPress={() => handleDeleteFile(index, 'image')}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Viewer
            visible={viewerVisible}
            onClose={() => setViewerVisible(false)}
            images={images.map((file) => ({ src: file.url, alt: file.name }))}
            activeIndex={currentImage}
          />

          {/* 视频预览 Card */}
          {videos.length > 0 && (
            <Card className="my-2 bg-default-50 shadow-none">
              <CardBody className="flex flex-col gap-4">
                {videos.map((file, index) => (
                  <div
                    key={index}
                    className="group relative aspect-video w-full">
                    <ReactPlayer
                      url={file.url}
                      width="100%"
                      height="100%"
                      controls
                    />
                    <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      className="absolute right-2 top-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
                      onPress={() => handleDeleteFile(index, 'video')}>
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Button
            onPress={handleNextStep}
            color="primary"
            disabled={!content}
            className="mt-4 w-full px-4 py-2 font-bold"
            endContent={<ArrowRightIcon className="size-4" />}>
            {t('dynamic.selectPlatforms')}
          </Button>
        </>
      ) : (
        <>
          <Card className="mb-4 bg-default-50 shadow-none">
            <CardBody className="gap-2">
              <Switch
                isSelected={autoPublish}
                onValueChange={setAutoPublish}
                startContent={<BotIcon className="size-4" />}
                endContent={<HandIcon className="size-4" />}>
                {t('dynamic.autoPublish')}
              </Switch>
              <div className="flex items-center justify-between">
                <p className="mb-2 text-sm font-medium">{t('dynamic.selectPlatforms')}</p>
                {selectedPlatforms.length > 0 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => setSelectedPlatforms([])}>
                    <TrashIcon className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform: PlatformInfo) => {
                  const isDisabled = false;

                  return (
                    <PlatformCheckbox
                      key={platform.name}
                      platformInfo={platform}
                      isSelected={selectedPlatforms.includes(platform.name)}
                      onChange={(_, isSelected) => handlePlatformChange(platform.name, isSelected)}
                      isDisabled={isDisabled}
                    />
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <Button
              onPress={handlePrevStep}
              variant="flat"
              className="w-full px-4 py-2 font-bold"
              startContent={<ArrowLeftIcon className="size-4" />}>
              {t('dynamic.content')}
            </Button>

            <Button
              onPress={handlePublish}
              color="primary"
              disabled={selectedPlatforms.length === 0}
              className="w-full px-4 py-2 font-bold"
              startContent={<SendIcon className="size-4" />}>
              {t('dynamic.publish')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
