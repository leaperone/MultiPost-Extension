import React, { useState, useRef } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, CardFooter } from '@nextui-org/react';
import { ImagePlusIcon, XIcon, DownloadIcon } from 'lucide-react';
import Viewer from 'react-viewer';
import type { FileData, SyncData } from '~sync/common';

interface PostTabProps {
  funcPublish: (data: SyncData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funcScraper: (url: string) => Promise<any>;
}

const PostTab: React.FC<PostTabProps> = ({ funcPublish, funcScraper }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [url, setUrl] = useState<string>('');
  const [importedContent, setImportedContent] = useState<{
    title: string;
    content: string;
    digest: string;
    cover: string;
    author: string;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const newFiles: FileData[] = Array.from(selectedFiles)
        .filter((file) => file.type.startsWith('image/'))
        .map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => (isSelected ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

  const handlePublish = async () => {
    if (!title || !content) {
      console.log('请输入标题和内容');
      return;
    }
    if (selectedPlatforms.length === 0) {
      console.log('至少选择一个平台');
      return;
    }
    const data: SyncData = {
      platforms: selectedPlatforms,
      data: {
        title,
        content,
        // images: files,
      },
      auto_publish: false,
    };
    console.log(data);

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS',
      });
      if (res === 'success') {
        chrome.windows.getCurrent({ populate: true }, (window) => {
          chrome.sidePanel.open({ windowId: window.id }).then(() => {
            funcPublish(data);
          });
        });
      } else {
        funcPublish(data);
      }
    } catch (error) {
      console.error('检查服务状态时出错:', error);
      funcPublish(data);
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = (index: number) => {
    setCurrentImage(index);
    setViewerVisible(true);
  };

  const handleDeleteImage = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (!url) {
      console.log('请输入有效的URL');
      return;
    }
    console.log('url', url);
    funcScraper(url).then((res) => {
      console.log('res', res);
      if (res && res.title && res.content) {
        setImportedContent({
          title: res.title,
          content: res.content,
          digest: res.digest || '',
          cover: res.cover || '',
          author: res.author || '',
        });
        setTitle(res.title);
        setContent(res.digest);
      }
    });
  };

  return (
    <>
      <Card className="mb-4 shadow-none h-fit bg-default-50">
        <CardBody>
          <div className="flex items-center space-x-2">
            <Input
              placeholder={chrome.i18n.getMessage('optionsEnterUrl')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="grow"
            />
            <Button
              onPress={handleImport}
              isDisabled={!url}>
              <DownloadIcon />
              {chrome.i18n.getMessage('optionsImport')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-none h-fit bg-default-50">
        <CardHeader>
          <Input
            placeholder={chrome.i18n.getMessage('optionsEnterPostTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder={chrome.i18n.getMessage('optionsEnterPostContent')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            minRows={10}
            autoFocus
          />
        </CardBody>

        <CardFooter>
          <div className="flex justify-center mb-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button
              isIconOnly
              variant="light"
              onPress={handleIconClick}>
              <ImagePlusIcon className="w-8 h-8 text-gray-600" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card className="my-2 h-full shadow-none bg-default-50">
        <CardBody className="flex flex-row flex-wrap gap-2 justify-center items-center">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group">
              <Image
                src={file.url}
                alt={file.name}
                width={100}
                height={100}
                className="object-cover rounded-md cursor-pointer"
                onClick={() => handleImageClick(index)}
              />
              <Button
                isIconOnly
                size="sm"
                color="danger"
                className="absolute top-0 right-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
                onPress={() => handleDeleteImage(index)}>
                <XIcon className="size-4" />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <Viewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        images={files.map((file) => ({ src: file.url, alt: file.name }))}
        activeIndex={currentImage}
      />

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
        <div className="grid grid-cols-2 gap-2"></div>
      </div>
      <Button
        onPress={handlePublish}
        color="primary"
        disabled={!title || !content || selectedPlatforms.length === 0}
        className="px-4 py-2 w-full font-bold">
        {chrome.i18n.getMessage('optionsSyncPost')}
      </Button>

      {importedContent && (
        <Card className="my-4 shadow-none bg-default-50">
          <CardHeader>
            <h3 className="text-lg font-bold">{chrome.i18n.getMessage('optionsImportedContent')}</h3>
            <Image
              src={importedContent.cover}
              alt={importedContent.title}
              width={100}
              height={100}
              className="object-cover rounded-md cursor-pointer"
              onClick={() => handleImageClick(0)}
            />
          </CardHeader>
          <CardBody>
            <h4 className="mb-2 font-semibold">{importedContent.title}</h4>
            <p className="mb-4 text-sm">{importedContent.digest}</p>
            <div
              className="max-w-none prose"
              dangerouslySetInnerHTML={{ __html: importedContent.content }}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default PostTab;
