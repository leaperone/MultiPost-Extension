import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Textarea, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { VideoIcon, XIcon, TrashIcon, SendIcon } from 'lucide-react';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
// import ReactPlayer from 'react-player';
import { type SyncData, type FileData, getPlatformInfos } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';

interface VideoTabProps {
  funcPublish: (data: SyncData) => void;
}

const VideoTab: React.FC<VideoTabProps> = ({ funcPublish }) => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('开发环境标题');
      setContent('开发环境内容');
    }
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
      console.log('请输入标题并上传视频');
      alert(chrome.i18n.getMessage('optionsEnterVideoTitle'));
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log('至少选择一个平台');
      alert(chrome.i18n.getMessage('optionsSelectPublishPlatforms'));
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

    try {
      chrome.windows.getCurrent({ populate: true }, (window) => {
        chrome.sidePanel.open({ windowId: window.id }).then(() => {
          funcPublish(data);
        });
      });
    } catch (error) {
      console.error('检查服务状态时出错:', error);
      funcPublish(data);
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearAll = () => {
    setTitle('');
    setContent('');
    setVideoFile(null);
    setSelectedPlatforms([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardHeader className="flex flex-col gap-4">
          <Input
            isClearable
            variant="underlined"
            label={chrome.i18n.getMessage('optionsEnterVideoTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClear={() => setTitle('')}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            isClearable
            label={chrome.i18n.getMessage('optionsEnterVideoDescription')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            variant="underlined"
            minRows={5}
            className="w-full"
            autoFocus
            onClear={() => setContent('')}
          />
        </CardBody>

        <CardFooter>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
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
                <VideoIcon className="w-5 h-5" />
              </Button>
            </div>
            {(title || content || videoFile) && (
              <Button
                isIconOnly
                variant="light"
                color="danger"
                onPress={handleClearAll}
                title={chrome.i18n.getMessage('optionsClearAll')}>
                <TrashIcon className="size-5" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {videoFile && (
        <Card className="shadow-none bg-default-50">
          <CardBody className="p-4">
            <div className="relative w-full group aspect-video">
              <Player
                playsInline
                src={videoFile.url}>
                <source src={videoFile.url} />
              </Player>
              <Button
                isIconOnly
                size="sm"
                color="danger"
                variant="light"
                className="absolute top-2 right-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
                onPress={handleRemoveVideo}>
                <XIcon className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-600">{videoFile.name}</p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4 p-4 rounded-lg bg-default-50">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
          <div className="grid grid-cols-2 gap-3">
            {getPlatformInfos('VIDEO').map((platform) => (
              <PlatformCheckbox
                key={platform.name}
                platformInfo={platform}
                isSelected={selectedPlatforms.includes(platform.name)}
                onChange={(_, isSelected) => handlePlatformChange(platform.name, isSelected)}
                isDisabled={false}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        onPress={handlePublish}
        color="primary"
        variant="flat"
        disabled={!videoFile || !title || !content || selectedPlatforms.length === 0}
        className="w-full font-medium shadow-none">
        <SendIcon className="mr-2 size-4" />
        {chrome.i18n.getMessage('optionsSyncVideo')}
      </Button>
    </div>
  );
};

export default VideoTab;
