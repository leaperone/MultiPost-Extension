import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter, Switch } from '@heroui/react';
import { ImagePlusIcon, VideoIcon, XIcon, TrashIcon, SendIcon } from 'lucide-react';
import Viewer from 'react-viewer';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
import type { FileData, SyncData } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';
import { getPlatformInfos } from '~sync/common';

interface DynamicTabProps {
  funcPublish: (data: SyncData) => void;
}

const DynamicTab: React.FC<DynamicTabProps> = ({ funcPublish }) => {
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

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('开发环境标题');
      setContent('开发环境内容');
    }
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
      console.log('至少输入内容');
      alert(chrome.i18n.getMessage('optionsEnterDynamicContent'));
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log('至少选择一个平台');
      alert(chrome.i18n.getMessage('optionsSelectPublishPlatforms'));
      return;
    }
    // const needImage = PLATFORM_NEED_IMAGE.some((platform) => selectedPlatforms.includes(platform));
    // if (needImage && images.length === 0) {
    //   console.log('至少一张图片');
    //   alert(chrome.i18n.getMessage('optionsAtLeastOneImage'));
    //   return;
    // }
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
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardHeader className="flex flex-col gap-4">
          <Input
            label={chrome.i18n.getMessage('optionsEnterDynamicTitle')}
            placeholder={chrome.i18n.getMessage('optionsEnterDynamicTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="flat"
            className="w-full"
          />
          <Textarea
            label={chrome.i18n.getMessage('optionsEnterDynamicContent')}
            placeholder={chrome.i18n.getMessage('optionsEnterDynamicContent')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            variant="flat"
            minRows={5}
            className="w-full"
            autoFocus
          />
        </CardHeader>

        <CardFooter>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
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
                <ImagePlusIcon className="w-5 h-5" />
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
                <VideoIcon className="w-5 h-5" />
              </Button>
            </div>
            <Button
              isIconOnly
              variant="light"
              color="danger"
              onPress={handleClearAll}
              title={chrome.i18n.getMessage('optionsClearAll')}>
              <TrashIcon className="w-5 h-5" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {images.length > 0 && (
        <Card className="shadow-none bg-default-50">
          <CardBody className="flex flex-row flex-wrap gap-3 justify-start items-start p-4">
            {images.map((file, index) => (
              <div
                key={index}
                className="relative group">
                <Image
                  src={file.url}
                  alt={file.name}
                  width={120}
                  height={120}
                  className="object-cover rounded-lg cursor-pointer"
                  onClick={() => handleImageClick(index)}
                />
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="light"
                  className="absolute top-1 right-1 z-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  onPress={() => handleDeleteFile(index, 'image')}>
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4 bg-default-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{chrome.i18n.getMessage('optionsAutoPublish')}</span>
          <Switch
            isSelected={autoPublish}
            onValueChange={setAutoPublish}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
          <div className="grid grid-cols-2 gap-3">
            {getPlatformInfos('DYNAMIC').map((platform) => (
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
        disabled={!title || !content || selectedPlatforms.length === 0}
        className="w-full font-medium shadow-none">
        <SendIcon className="size-4 mr-2" />
        {chrome.i18n.getMessage('optionsSyncDynamic')}
      </Button>

      {videos.length > 0 && (
        <Card className="my-2 shadow-none bg-default-50">
          <CardBody className="flex flex-col gap-4">
            {videos.map((file, index) => (
              <div
                key={index}
                className="relative w-full group aspect-video">
                <Player
                  playsInline
                  src={file.url}>
                  <source src={file.url} />
                </Player>
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="light"
                  className="absolute top-2 right-2 z-50 opacity-0 transition-opacity group-hover:opacity-100"
                  onPress={() => handleDeleteFile(index, 'video')}>
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
    </div>
  );
};

export default DynamicTab;
