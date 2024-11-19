import React, { useState, useRef } from 'react';
import { Card, Button, Input, Textarea, CardHeader, CardBody, CardFooter } from '@nextui-org/react';
import { VideoIcon, XIcon } from 'lucide-react';
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

  return (
    <>
      <Card className="shadow-none h-fit bg-default-50">
        <CardHeader>
          <Input
            placeholder={chrome.i18n.getMessage('optionsEnterVideoTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder={chrome.i18n.getMessage('optionsEnterVideoDescription')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            minRows={5}
            autoFocus
          />
        </CardBody>

        <CardFooter>
          <div className="flex flex-col items-center w-full">
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
                  <VideoIcon className="w-8 h-8 text-gray-600" />
                </Button>
                <p className="mt-2 text-sm text-gray-500">{chrome.i18n.getMessage('optionsUploadVideo')}</p>
              </>
            ) : (
              <div className="w-full">
                <div className="relative mb-2 w-full aspect-video">
                  <Player
                    playsInline
                    src={videoFile.url}>
                    <source src={videoFile.url} />
                  </Player>
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="flat"
                    className="absolute top-2 right-2 z-50"
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
        <p className="mb-2 text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
        <div className="grid grid-cols-2 gap-2">
          {getPlatformInfos('VIDEO').map(platform => {
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
        className="px-4 py-2 mt-4 w-full font-bold">
        {chrome.i18n.getMessage('optionsSyncVideo')}
      </Button>
    </>
  );
};

export default VideoTab;
