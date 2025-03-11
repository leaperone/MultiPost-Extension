import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter, Switch } from '@heroui/react';
import { XIcon, TrashIcon, SendIcon, HandIcon, BotIcon, FileVideo2Icon, FileImageIcon, Eraser } from 'lucide-react';
import Viewer from 'react-viewer';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
import type { FileData, SyncData } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';
import { getPlatformInfos } from '~sync/common';
import { Storage } from '@plasmohq/storage';

// Constants
const STORAGE_KEY = 'dynamicPlatforms';
const MAX_VIDEO_COUNT = 1;

interface DynamicTabProps {
  funcPublish: (data: SyncData) => void;
}

interface FormState {
  title: string;
  content: string;
  images: FileData[];
  videos: FileData[];
  selectedPlatforms: string[];
  autoPublish: boolean;
}

const DynamicTab: React.FC<DynamicTabProps> = ({ funcPublish }) => {
  const [formState, setFormState] = useState<FormState>({
    title: process.env.NODE_ENV === 'development' ? '开发环境标题' : '',
    content: process.env.NODE_ENV === 'development' ? '开发环境内容' : '',
    images: [],
    videos: [],
    selectedPlatforms: [],
    autoPublish: false,
  });

  const [viewerState, setViewerState] = useState({
    visible: false,
    currentImage: 0,
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const storage = useMemo(() => new Storage({ area: 'local' }), []);

  // 文件处理函数
  const handleFileProcess = useCallback(
    (file: File): FileData => ({
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }),
    [],
  );

  // 粘贴处理
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      Array.from(items).forEach((item) => {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (!file) return;

          const fileData = handleFileProcess(file);

          if (file.type.startsWith('image/')) {
            setFormState((prev) => ({
              ...prev,
              images: [...prev.images, fileData],
            }));
          } else if (file.type.startsWith('video/') && formState.videos.length < MAX_VIDEO_COUNT) {
            setFormState((prev) => ({
              ...prev,
              videos: [fileData],
            }));
          }
        }
      });
    },
    [handleFileProcess, formState.videos.length],
  );

  // 拖放处理
  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer?.files;
      if (!files) return;

      const imageFiles: FileData[] = [];
      let videoFile: FileData | null = null;

      Array.from(files).forEach((file) => {
        const fileData = handleFileProcess(file);

        if (file.type.startsWith('image/')) {
          imageFiles.push(fileData);
        } else if (file.type.startsWith('video/') && !videoFile && formState.videos.length < MAX_VIDEO_COUNT) {
          videoFile = fileData;
        }
      });

      setFormState((prev) => ({
        ...prev,
        images: [...prev.images, ...imageFiles],
        videos: videoFile ? [videoFile] : prev.videos,
      }));
    },
    [handleFileProcess, formState.videos.length],
  );

  // 初始化加载平台数据
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const platforms = await storage.get<string[]>(STORAGE_KEY);
        if (platforms) {
          setFormState((prev) => ({ ...prev, selectedPlatforms: platforms }));
        }
      } catch (error) {
        console.error('加载平台数据失败:', error);
      }
    };

    loadPlatforms();
  }, [storage]);

  // 添加事件监听器
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    const dropArea = dropAreaRef.current;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

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
  }, [handlePaste, handleDrop]);

  // 文件变更处理
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles)
        .filter((file) => file.type.startsWith(`${fileType}/`))
        .map(handleFileProcess);

      setFormState((prev) => ({
        ...prev,
        [fileType === 'image' ? 'images' : 'videos']:
          fileType === 'image'
            ? [...prev.images, ...newFiles]
            : newFiles.length > 0 && prev.videos.length < MAX_VIDEO_COUNT
            ? [newFiles[0]]
            : prev.videos,
      }));
    },
    [handleFileProcess],
  );

  // 平台选择处理
  const handlePlatformChange = useCallback(
    async (platform: string, isSelected: boolean) => {
      const newPlatforms = isSelected
        ? [...formState.selectedPlatforms, platform]
        : formState.selectedPlatforms.filter((p) => p !== platform);

      setFormState((prev) => ({ ...prev, selectedPlatforms: newPlatforms }));
      await storage.set(STORAGE_KEY, newPlatforms);
    },
    [formState.selectedPlatforms, storage],
  );

  // 发布处理
  const handlePublish = useCallback(async () => {
    if (!formState.content) {
      alert(chrome.i18n.getMessage('optionsEnterDynamicContent'));
      return;
    }
    if (formState.selectedPlatforms.length === 0) {
      alert(chrome.i18n.getMessage('optionsSelectPublishPlatforms'));
      return;
    }

    const data: SyncData = {
      platforms: formState.selectedPlatforms,
      data: {
        title: formState.title,
        content: formState.content,
        images: formState.images,
        videos: formState.videos,
      },
      auto_publish: formState.autoPublish,
    };

    try {
      const window = await chrome.windows.getCurrent({ populate: true });
      await chrome.sidePanel.open({ windowId: window.id });
      funcPublish(data);
    } catch (error) {
      console.error('发布时出错:', error);
      funcPublish(data);
    }
  }, [formState, funcPublish]);

  // 清空所有内容
  const handleClearAll = useCallback(() => {
    setFormState({
      title: '',
      content: '',
      images: [],
      videos: [],
      selectedPlatforms: [],
      autoPublish: false,
    });
  }, []);

  // 清空平台选择
  const clearSelectedPlatforms = useCallback(async () => {
    setFormState((prev) => ({ ...prev, selectedPlatforms: [] }));
    await storage.set(STORAGE_KEY, []);
  }, [storage]);

  // 删除文件
  const handleDeleteFile = useCallback((index: number, fileType: 'image' | 'video') => {
    setFormState((prev) => ({
      ...prev,
      [fileType === 'image' ? 'images' : 'videos']:
        fileType === 'image' ? prev.images.filter((_, i) => i !== index) : [],
    }));
  }, []);

  // 图片查看器控制
  const handleImageClick = useCallback((index: number) => {
    setViewerState({
      currentImage: index,
      visible: true,
    });
  }, []);

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
            value={formState.title}
            onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
            onClear={() => setFormState((prev) => ({ ...prev, title: '' }))}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            isClearable
            label={chrome.i18n.getMessage('optionsEnterDynamicContent')}
            value={formState.content}
            onChange={(e) => setFormState((prev) => ({ ...prev, content: e.target.value }))}
            variant="underlined"
            minRows={5}
            className="w-full"
            autoFocus
            onClear={() => setFormState((prev) => ({ ...prev, content: '' }))}
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
                onPress={() => imageInputRef.current?.click()}>
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
                onPress={() => videoInputRef.current?.click()}>
                <FileVideo2Icon className="size-5" />
              </Button>
              {formState.videos.length > 0 && (
                <span className="text-xs text-gray-500">{chrome.i18n.getMessage('optionsNoticeDynamicVideo')}</span>
              )}
            </div>
            {(formState.title || formState.content || formState.images.length > 0 || formState.videos.length > 0) && (
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

      {formState.images.length > 0 && (
        <Card className="shadow-none bg-default-50">
          <CardBody className="flex flex-row flex-wrap gap-3 justify-start items-start p-4">
            {formState.images.map((file, index) => (
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
          isSelected={formState.autoPublish}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, autoPublish: value }))}
          startContent={<BotIcon className="size-4" />}
          endContent={<HandIcon className="size-4" />}>
          {chrome.i18n.getMessage('optionsAutoPublish')}
        </Switch>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <p className="text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
            </div>
            {formState.selectedPlatforms.length > 0 && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={clearSelectedPlatforms}
                title="清空平台"
                className="hover:bg-danger-100">
                <Eraser className="size-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1 xs:grid-cols-3 sm:grid-cols-4">
            {getPlatformInfos('DYNAMIC').map((platform) => (
              <PlatformCheckbox
                key={platform.name}
                platformInfo={platform}
                isSelected={formState.selectedPlatforms.includes(platform.name)}
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
        disabled={!formState.title || !formState.content || formState.selectedPlatforms.length === 0}
        className="w-full font-medium shadow-none">
        <SendIcon className="mr-2 size-4" />
        {chrome.i18n.getMessage('optionsSyncDynamic')}
      </Button>

      {formState.videos.length > 0 && (
        <Card className="my-2 shadow-none bg-default-50">
          <CardBody className="flex flex-col gap-4">
            {formState.videos.map((file, index) => (
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
        visible={viewerState.visible}
        onClose={() => setViewerState({ ...viewerState, visible: false })}
        images={formState.images.map((file) => ({ src: file.url, alt: file.name }))}
        activeIndex={viewerState.currentImage}
      />
    </div>
  );
};

export default DynamicTab;
