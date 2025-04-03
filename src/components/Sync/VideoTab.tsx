import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Textarea,
  CardHeader,
  CardBody,
  CardFooter,
  Accordion,
  AccordionItem,
} from '@heroui/react';
import { VideoIcon, XIcon, TrashIcon, SendIcon, Eraser } from 'lucide-react';
import { Player } from 'video-react';
import 'video-react/dist/video-react.css';
// import ReactPlayer from 'react-player';
import { type SyncData, type FileData } from '~sync/common';
import type { PlatformInfo } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';
import { getPlatformInfos } from '~sync/common';
import { Storage } from '@plasmohq/storage';
import { Icon } from '@iconify/react';
import  { useStorage } from '@plasmohq/storage/hook';
import { ACCOUNT_INFO_STORAGE_KEY } from '~sync/account';
import { EXTRA_CONFIG_STORAGE_KEY } from '~sync/extraconfig';

interface VideoTabProps {
  funcPublish: (data: SyncData) => void;
}

const VideoTab: React.FC<VideoTabProps> = ({ funcPublish }) => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [videoFile, setVideoFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const storage = new Storage({
    area: 'local', // 明确指定使用 localStorage
  });

  const [accountInfos] = useStorage({
    key: ACCOUNT_INFO_STORAGE_KEY,
    instance: storage,
  });
  const [extraConfigMap] = useStorage({
    key: EXTRA_CONFIG_STORAGE_KEY,
    instance: storage,
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTitle('开发环境标题');
      setContent('开发环境内容');
    }
    setSelectedPlatforms(JSON.parse(localStorage.getItem('videoPlatforms') || '[]'));
  }, []);

  // 加载平台信息
  useEffect(() => {
    const loadPlatformInfos = async () => {
      try {
        const infos = await getPlatformInfos('VIDEO');
        setPlatforms(infos);
      } catch (error) {
        console.error('加载平台信息失败:', error);
      }
    };

    loadPlatformInfos();
  }, [accountInfos, extraConfigMap]);

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

  const handlePlatformChange = async (platform: string, isSelected: boolean) => {
    const newSelectedPlatforms = isSelected
      ? [...selectedPlatforms, platform]
      : selectedPlatforms.filter((p) => p !== platform);
    setSelectedPlatforms(newSelectedPlatforms);
    await storage.set('videoPlatforms', newSelectedPlatforms);
  };

  const clearSelectedPlatforms = async () => {
    setSelectedPlatforms([]);
    await storage.set('videoPlatforms', []);
  };

  const loadPlatforms = async () => {
    const platforms = await storage.get<string[]>('videoPlatforms');
    setSelectedPlatforms((platforms as string[]) || []);
  };
  loadPlatforms();

  const getSyncData = () => {
    return {
      platforms: selectedPlatforms.map((platform) => platforms.find((p) => p.name === platform)),
      data: {
        title,
        content,
        video: videoFile,
      },
      auto_publish: false,
    };
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

    const data: SyncData = getSyncData();

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
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex flex-col w-full gap-4 md:w-1/2">
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
              <div className="flex items-center justify-between w-full">
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
                    className="absolute z-50 transition-opacity opacity-0 top-2 right-2 group-hover:opacity-100"
                    onPress={handleRemoveVideo}>
                    <XIcon className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-600">{videoFile.name}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="flex flex-col w-full gap-4 md:w-1/2">
          <div className="flex flex-col gap-4 p-4 rounded-lg bg-default-50">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"></div>
                {selectedPlatforms.length > 0 && (
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

              <Accordion
                isCompact
                variant="light"
                selectionMode="multiple"
                defaultExpandedKeys={['CN']}>
                <AccordionItem
                  key="CN"
                  title={chrome.i18n.getMessage('optionsCNPlatforms')}
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
                        className="w-full h-max"
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
                          syncData={getSyncData()}
                        />
                      ))}
                  </div>
                </AccordionItem>
                <AccordionItem
                  key="International"
                  title={chrome.i18n.getMessage('optionsInternationalPlatforms')}
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
                        className="w-full h-max"
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
                          syncData={getSyncData()}
                        />
                      ))}
                  </div>
                </AccordionItem>
              </Accordion>
            </div>

            <Button
              onPress={handlePublish}
              color="primary"
              variant="flat"
              disabled={!videoFile || !title || !content || selectedPlatforms.length === 0}
              className="w-full mt-2 font-medium shadow-none">
              <SendIcon className="mr-2 size-4" />
              {chrome.i18n.getMessage('optionsSyncVideo')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTab;
