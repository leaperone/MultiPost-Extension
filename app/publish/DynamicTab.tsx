'use client';

import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter, Switch } from '@heroui/react';
import { ImagePlusIcon, VideoIcon, XIcon, TrashIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from 'react';
import Viewer from 'react-viewer';
import { useTranslation } from '@/i18n/client';

import type { PlatformInfo } from '@/types/platform';
import type { FileData, SyncData } from '@/types/sync';

import { funcPublish, getPlatformInfos } from './common';
import PlatformCheckbox from './PlatformCheckbox';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

const DynamicTab: React.FC = () => {
  const { t } = useTranslation('publish');
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
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
    setSelectedPlatforms((prev) => (isSelected ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

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
    setAutoPublish(false);
  };

  return (
    <>
      <Card className="h-fit bg-default-50 shadow-none">
        <CardHeader>
          <Input
            placeholder={t('dynamic.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder={t('dynamic.content')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
            <Button
              isIconOnly
              variant="light"
              color="danger"
              onPress={handleClearAll}
              title={t('dynamic.clearAll')}>
              <TrashIcon className="size-6" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* 图片预览 Card */}
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

      <Viewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        images={images.map((file) => ({ src: file.url, alt: file.name }))}
        activeIndex={currentImage}
      />

      <div className="mb-4">
        <div className="flex items-center">
          <p className="mr-2 text-sm font-bold">{t('dynamic.autoPublish')}: </p>
          <Switch
            isSelected={autoPublish}
            onValueChange={setAutoPublish}
          />
        </div>
        <p className="mb-2 text-sm font-medium">{t('dynamic.selectPlatforms')}</p>
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
      </div>
      <Button
        onPress={handlePublish}
        color="primary"
        disabled={images.length === 0 || !title || !content || selectedPlatforms.length === 0}
        className="mb-4 w-full px-4 py-2 font-bold">
        {t('dynamic.publish')}
      </Button>

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
    </>
  );
};

export default DynamicTab;
