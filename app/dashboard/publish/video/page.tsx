'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Textarea, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { VideoIcon, XIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { FileData, SyncData } from '@/lib/extension';
import PlatformCheckbox from '../components/PlatformCheckbox';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo } from '@/lib/extension';
import { useTranslation } from '@/i18n/client';
import { usePlatformStore } from '@/store/publish.store';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

export default function VideoPage() {
  const { t } = useTranslation('publish');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoPlatforms, setVideoPlatforms, clearVideoPlatforms } = usePlatformStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(videoPlatforms);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  useEffect(() => {
    getPlatformInfos('VIDEO').then(setPlatforms);
  }, []);

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
      console.log(t('validation.titleAndVideoRequired'));
      alert(t('validation.titleAndVideoRequired'));
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log(t('validation.platformRequired'));
      alert(t('validation.platformRequired'));
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

  return (
    <>
      <Card className="h-fit bg-default-50 shadow-none">
        <CardHeader>
          <Input
            placeholder={t('video.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder={t('video.description')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            minRows={5}
            autoFocus
          />
        </CardBody>

        <CardFooter>
          <div className="flex w-full flex-col items-center">
            {!videoFile ? (
              <>
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
                <p className="mt-2 text-sm text-gray-500">{t('video.upload')}</p>
              </>
            ) : (
              <div className="w-full">
                <div className="relative mb-2 aspect-video w-full">
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
                    variant="flat"
                    className="absolute right-2 top-2 z-50"
                    onPress={handleRemoveVideo}>
                    <XIcon size={16} />
                  </Button>
                </div>
                <p className="text-sm text-gray-600">{videoFile.name}</p>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">{t('video.selectPlatforms')}</p>
        <div className="grid grid-cols-2 gap-2">
          {platforms.map((platform: PlatformInfo) => {
            return (
              <PlatformCheckbox
                key={platform.name}
                platformInfo={platform}
                isSelected={selectedPlatforms.includes(platform.name)}
                onChange={(_, isSelected) => handlePlatformChange(platform.name, isSelected)}
                isDisabled={false}
              />
            );
          })}
        </div>
      </div>
      <Button
        onPress={handlePublish}
        color="primary"
        disabled={!videoFile || !title || !content || selectedPlatforms.length === 0}
        className="mt-4 w-full px-4 py-2 font-bold">
        {t('video.publish')}
      </Button>
    </>
  );
}
