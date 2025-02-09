import React, { useState, useRef } from 'react';
import { Card, Button, Image, Input, Textarea, CardHeader, CardBody, Progress, CardFooter } from '@heroui/react';
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
  const [images, setImages] = useState<FileData[]>([]);
  const [videos, setVideos] = useState<FileData[]>([]);
  const [fileDatas, setFileDatas] = useState<FileData[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [processProgress, setProcessProgress] = useState(0);

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
        images: images || [],
        videos: videos || [],
        fileDatas: [...fileDatas, ...images, ...videos],
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

  const processImportedContent = async (content: string) => {
    setIsProcessing(true);
    setProcessStatus(chrome.i18n.getMessage('processingImages'));
    setProcessProgress(0);

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));
    const videos = Array.from(doc.querySelectorAll('video'));
    const files = Array.from(doc.querySelectorAll('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"]'));

    const fileDatas: FileData[] = [];
    const imageFileDatas: FileData[] = [];
    const videoFileDatas: FileData[] = [];

    // 处理图片
    for (let i = 0; i < images.length; i++) {
      try {
        const img = images[i];
        const src = img.src;
        const response = await fetch(src);
        const blob = await response.blob();
        const fileData: FileData = {
          name: `image_${i}.${blob.type.split('/')[1]}`,
          type: blob.type,
          size: blob.size,
          url: URL.createObjectURL(blob),
        };
        imageFileDatas.push(fileData);

        // 替换原始图片的 src 为本地 URL
        img.src = fileData.url;

        // 如果是第一张图片且没有设置封面，则设置为封面
        if (i === 0 && !coverImage) {
          setCoverImage(fileData);
        }

        setProcessProgress((i / images.length) * 100);
      } catch (error) {
        console.error('处理图片时出错:', error);
      }
    }

    // 处理视频
    setProcessStatus(chrome.i18n.getMessage('processingVideos'));
    for (let i = 0; i < videos.length; i++) {
      try {
        const video = videos[i];
        const src = video.src;
        const response = await fetch(src);
        const blob = await response.blob();
        const fileData: FileData = {
          name: `video_${i}.${blob.type.split('/')[1]}`,
          type: blob.type,
          size: blob.size,
          url: URL.createObjectURL(blob),
        };
        videoFileDatas.push(fileData);

        // 替换原始视频的 src 为本地 URL
        video.src = fileData.url;
      } catch (error) {
        console.error('处理视频时出错:', error);
      }
    }

    // 处理文件
    setProcessStatus(chrome.i18n.getMessage('processingFiles'));
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const href = file.getAttribute('href');
        if (href) {
          const response = await fetch(href);
          const blob = await response.blob();
          const fileData: FileData = {
            name: file.textContent || `file_${i}`,
            type: blob.type,
            size: blob.size,
            url: URL.createObjectURL(blob),
          };
          fileDatas.push(fileData);

          // 替换原始文件链接的 href 为本地 URL
          file.setAttribute('href', fileData.url);
        }
      } catch (error) {
        console.error('处理文件时出错:', error);
      }
    }

    setIsProcessing(false);

    // 返回处理后的 HTML 内容和文件数据
    return {
      imageFileDatas,
      videoFileDatas,
      fileDatas,
      processedContent: doc.body.innerHTML,
    };
  };

  const handleImport = async () => {
    if (!url) {
      console.log('请输入有效的URL');
      return;
    }

    try {
      const res = await funcScraper(url);
      if (res && res.title && res.content) {
        const { imageFileDatas, videoFileDatas, fileDatas, processedContent } = await processImportedContent(
          res.content,
        );

        // 如果导入的内容有封面图，且当前没有设置封面，则设置为封面
        if (res.cover && !coverImage) {
          try {
            const response = await fetch(res.cover);
            const blob = await response.blob();
            const coverFileData: FileData = {
              name: `cover.${blob.type.split('/')[1]}`,
              type: blob.type,
              size: blob.size,
              url: URL.createObjectURL(blob),
            };
            setCoverImage(coverFileData);
          } catch (error) {
            console.error('处理封面图片时出错:', error);
          }
        }

        setImportedContent({
          title: res.title,
          content: processedContent,
          digest: res.digest || '',
          cover: res.cover || '',
          author: res.author || '',
        });

        setTitle(res.title);
        setContent(processedContent);
        setDigest(res.digest || '');
        setImages(imageFileDatas);
        setVideos(videoFileDatas);
        setFileDatas(fileDatas);
      }
    } catch (error) {
      console.error('导入内容时出错:', error);
    }
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

        {isProcessing && (
          <CardFooter>
            <div className="flex flex-col gap-2">
              <p className="text-sm">{processStatus}</p>
              <Progress
                value={processProgress}
                color="primary"
                className="w-full"
              />
            </div>
          </CardFooter>
        )}
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
