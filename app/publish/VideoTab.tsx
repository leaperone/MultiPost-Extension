'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Textarea, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { VideoIcon, XIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { FileData, SyncData } from '@/types/sync';
import PlatformCheckbox from './PlatformCheckbox';
import { funcPublish, getPlatformInfos } from './common';
import type { PlatformInfo } from '@/types/platform';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
});

const VideoTab: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
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
  };

  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => (isSelected ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

  const handlePublish = async () => {
    if (!title || !videoFile) {
      console.log('Please enter a title and upload a video');
      alert('Please enter a title and upload a video');
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log('Please select at least one platform');
      alert('Please select at least one platform');
      return;
    }

    const data: SyncData = {
      platforms: selectedPlatforms,
      data: {
        title,
        content,
        video: videoFile,
      },
      auto_publish: false,
    };
    console.log(data);

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
            placeholder="Please enter a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder="Please enter a description"
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
                <p className="mt-2 text-sm text-gray-500">Upload Video</p>
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
        <p className="mb-2 text-sm font-medium">Select Publishing Platforms</p>
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
        Sync Video
      </Button>
    </>
  );
};

export default VideoTab;
