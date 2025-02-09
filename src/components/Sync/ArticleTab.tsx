import React, { useState, useRef } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody } from '@heroui/react';
import { ImagePlusIcon, XIcon, DownloadIcon } from 'lucide-react';
import type { FileData, SyncData } from '~sync/common';
import PlatformCheckbox from './PlatformCheckbox';
import { getPlatformInfos } from '~sync/common';

interface ArticleTabProps {
  funcPublish: (data: SyncData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funcScraper: (url: string) => Promise<any>;
}

const ArticleTab: React.FC<ArticleTabProps> = ({ funcPublish, funcScraper }) => {
  const [title, setTitle] = useState<string>('');
  const [digest, setDigest] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [url, setUrl] = useState<string>('');
  const [importedContent, setImportedContent] = useState<{
    title: string;
    content: string;
    digest: string;
    cover: string;
    author: string;
  } | null>(null);
  const [coverImage, setCoverImage] = useState<FileData | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePlatformChange = (platform: string, isSelected: boolean) => {
    setSelectedPlatforms((prev) => (isSelected ? [...prev, platform] : prev.filter((p) => p !== platform)));
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const newCover: FileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        url: URL.createObjectURL(selectedFile),
      };
      setCoverImage(newCover);
    }
  };

  const handleDeleteCover = () => {
    setCoverImage(null);
  };

  const handlePublish = async () => {
    if (!title || !digest) {
      console.log('请输入标题和摘要');
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
        content: content || digest,
        digest,
        cover: coverImage || null,
        images: [],
        videos: [],
        fileDatas: [],
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
        setContent(res.content);
        setDigest(res.digest || '');
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

      <Card className="mb-4 shadow-none h-fit bg-default-50">
        <CardHeader>
          <h3 className="text-sm font-medium">{chrome.i18n.getMessage('optionsCoverImage')}</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center">
            <input
              type="file"
              ref={coverInputRef}
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
            {coverImage ? (
              <div className="relative group">
                <Image
                  src={coverImage.url}
                  alt={coverImage.name}
                  width={200}
                  height={150}
                  className="object-cover rounded-md"
                />
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  className="absolute top-0 right-0 z-50 m-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onPress={handleDeleteCover}>
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="light"
                onPress={() => coverInputRef.current?.click()}>
                <ImagePlusIcon className="w-6 h-6 mr-2" />
                {chrome.i18n.getMessage('optionsUploadCover')}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-none h-fit bg-default-50">
        <CardHeader>
          <Input
            placeholder={chrome.i18n.getMessage('optionsEnterArticleTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </CardHeader>

        <CardBody>
          <Textarea
            placeholder={chrome.i18n.getMessage('optionsEnterArticleDigest')}
            value={digest}
            onChange={(e) => setDigest(e.target.value)}
            fullWidth
            minRows={5}
            autoFocus
          />
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4 bg-default-50 p-4 rounded-lg">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{chrome.i18n.getMessage('optionsSelectPublishPlatforms')}</p>
          <div className="grid grid-cols-2 gap-3">
            {getPlatformInfos('ARTICLE').map((platform) => (
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
        disabled={!title || !digest || selectedPlatforms.length === 0}
        className="px-4 py-2 w-full font-bold">
        {chrome.i18n.getMessage('optionsSyncArticle')}
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

export default ArticleTab;
