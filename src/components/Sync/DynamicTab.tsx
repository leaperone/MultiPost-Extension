import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter, Switch } from '@heroui/react';
import { XIcon, TrashIcon, SendIcon, HandIcon, BotIcon, FileVideo2Icon, FileImageIcon } from 'lucide-react';
import Viewer from 'react-viewer';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
import type { FileData, SyncData } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';
import { getPlatformInfos } from '~sync/common';
import { Storage } from '@plasmohq/storage';
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
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const storage = new Storage({
    area: 'local', // 明确指定使用 localStorage
  });
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('开发环境标题');
      setContent('开发环境内容');
    }
    setSelectedPlatforms(JSON.parse(localStorage.getItem('dynamicPlatforms') || '[]'));

    // 添加粘贴事件监听器
    document.addEventListener('paste', handlePaste);

    // 添加拖拽事件监听器
    const dropArea = dropAreaRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
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
        // 只允许一个视频，如果已有视频则替换
        setVideos([newFiles[0]]);
      }
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (!file) continue;

        if (file.type.startsWith('image/')) {
          setImages((prevImages) => [
            ...prevImages,
            {
              name: file.name || `pasted-image-${Date.now()}.png`,
              type: file.type,
              size: file.size,
              url: URL.createObjectURL(file),
            },
          ]);
        } else if (file.type.startsWith('video/')) {
          // 只允许一个视频
          if (videos.length === 0) {
            setVideos([
              {
                name: file.name || `pasted-video-${Date.now()}.mp4`,
                type: file.type,
                size: file.size,
                url: URL.createObjectURL(file),
              },
            ]);
          }
          break; // 处理完第一个视频后退出循环
        }
      }
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (!files) return;

    const imageFiles: FileData[] = [];
    let videoFile: FileData | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        imageFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        });
      } else if (file.type.startsWith('video/') && !videoFile) {
        // 只取第一个视频文件
        videoFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        };
      }
    }

    if (imageFiles.length > 0) {
      setImages((prevImages) => [...prevImages, ...imageFiles]);
    }

    if (videoFile && videos.length === 0) {
      setVideos([videoFile]);
    }
  };

  const handlePlatformChange = async (platform: string, isSelected: boolean) => {
    const newSelectedPlatforms = isSelected
      ? [...selectedPlatforms, platform]
      : selectedPlatforms.filter((p) => p !== platform);
    setSelectedPlatforms(newSelectedPlatforms);
    await storage.set('dynamicPlatforms', newSelectedPlatforms);
  };

  const clearSelectedPlatforms = async () => {
    setSelectedPlatforms([]);
    await storage.set('dynamicPlatforms', []);
  };
  
  const loadPlatforms = async () => {
    const platforms = await storage.get<string[]>('dynamicPlatforms');
    setSelectedPlatforms((platforms as string[]) || []);
  };
  loadPlatforms();

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
      setVideos([]);
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
    <div
      className="flex flex-col gap-4"
      ref={dropAreaRef}>
      <Card className="shadow-none bg-default-50">
        <CardHeader className="flex flex-col gap-4">
          <Input
            isClearable
            variant="underlined"
            label={chrome.i18n.getMessage('optionsEnterDynamicTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClear={() => setTitle('')}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            isClearable
            label={chrome.i18n.getMessage('optionsEnterDynamicContent')}
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
                <FileImageIcon className="size-5" />
              </Button>
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
                className="hidden"
              />
              <Button
                isIconOnly
                variant="light"
                onPress={() => handleIconClick('video')}>
                <FileVideo2Icon className="size-5" />
              </Button>
            </div>
            {(title || content || images.length > 0 || videos.length > 0) && (
              <Button
                isIconOnly
                variant="light"
                color="danger"
                onPress={handleClearAll}
                title={chrome.i18n.getMessage('optionsClearAll')}>
                <TrashIcon className="w-5 h-5" />
              </Button>
            )}
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

      <div className="flex flex-col gap-4 p-4 rounded-lg bg-default-50">
        <Switch
          isSelected={autoPublish}
          onValueChange={setAutoPublish}
          startContent={<BotIcon className="size-4" />}
          endContent={<HandIcon className="size-4" />}>
          {chrome.i18n.getMessage('optionsAutoPublish')}
        </Switch>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
            </div>
            {selectedPlatforms.length > 0 && (
              <Button 
                size="sm" 
                variant="light" 
                color="danger" 
                onPress={clearSelectedPlatforms}
                className="text-xs"
              >
                {chrome.i18n.getMessage('optionsClearPlatforms') || chrome.i18n.getMessage('optionsClearAll') || '清空平台'}
              </Button>
            )}
          </div>
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
        <SendIcon className="mr-2 size-4" />
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
