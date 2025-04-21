import '~style.css';
import React, { useEffect, useState } from 'react';
import { HeroUIProvider, Progress, Button } from '@heroui/react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import cssText from 'data-text:~style.css';
import {
  infoMap,
  type ArticleData,
  type DynamicData,
  type FileData,
  type PodcastData,
  type SyncData,
  type VideoData,
} from '~sync/common';

export function getShadowContainer() {
  return document.querySelector('#test-shadow').shadowRoot.querySelector('#plasmo-shadow-container');
}

export const getShadowHostId = () => 'test-shadow';

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

// 聚焦到主窗口的函数
const focusMainWindow = async () => {
  const windows = await chrome.windows.getAll();
  const mainWindow = windows.find((window) => window.type === 'normal');
  if (mainWindow?.id) {
    await chrome.windows.update(mainWindow.id, { focused: true });
  }
};

interface PlatformStatus {
  name: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const getTitleFromData = (data: SyncData) => {
  const { data: contentData } = data;
  if ('content' in contentData) {
    return contentData.title || contentData.content;
  }
  return contentData.title;
};

export default function Publish() {
  const [title, setTitle] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [processedData, setProcessedData] = useState<SyncData | null>(null);

  async function processArticle(data: SyncData): Promise<SyncData> {
    setNotice('正在处理文章内容和图片...');
    const parser = new DOMParser();
    const { htmlContent, markdownContent, images } = data.data as ArticleData;
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const imgElements = Array.from(doc.getElementsByTagName('img')) as HTMLImageElement[];
    const blobUrls: string[] = [];

    const processedImages: FileData[] = [];
    let processedHtmlContent = htmlContent;
    let processedMarkdownContent = markdownContent;

    // 处理所有图片
    for (const img of imgElements) {
      try {
        const originalUrl = img.src;
        // 跳过已经是 blob URL 的图片
        if (originalUrl.startsWith('blob:')) continue;

        // 下载图片并创建 blob URL
        const response = await fetch(originalUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // 替换 HTML 中的图片 URL
        img.src = blobUrl;
        blobUrls.push(blobUrl);

        processedImages.push({
          name: images?.find((image) => image.url === originalUrl)?.name || originalUrl.split('/').pop() || blobUrl,
          url: blobUrl,
          type: blob.type,
          size: blob.size,
        });

        // 替换 markdown 中的图片 URL
        // 使用正则表达式匹配 markdown 中的图片语法
        const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imgRegex = new RegExp(`!\\[.*?\\]\\(${escapedUrl}\\)`, 'g');
        processedMarkdownContent = processedMarkdownContent.replace(imgRegex, (match) => {
          return match.replace(originalUrl, blobUrl);
        });
      } catch (error) {
        console.error('处理图片时出错:', error);
        // 继续处理下一张图片
        setNotice(`处理图片失败: ${img.src}`);
        setPlatformStatuses((prev) => [
          ...prev,
          {
            name: '图片处理',
            status: 'error',
            error: `处理图片失败: ${img.src}`,
          },
        ]);
      }
    }

    processedHtmlContent = doc.documentElement.outerHTML;

    return {
      ...data,
      data: {
        ...data.data,
        htmlContent: processedHtmlContent,
        markdownContent: processedMarkdownContent,
        images: processedImages,
      },
    };
  }

  const processFile = async (file: FileData) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return {
        ...file,
        url: blobUrl,
      };
    } catch (error) {
      console.error('处理文件时出错:', error);
      setPlatformStatuses((prev) => [
        ...prev,
        {
          name: '文件处理',
          status: 'error',
          error: `处理文件失败: ${file.name}`,
        },
      ]);
      return file;
    }
  };

  const processDynamic = async (data: SyncData) => {
    setNotice('正在处理动态内容...');
    const { images, videos } = data.data as DynamicData;

    const processedImages: FileData[] = [];
    const processedVideos: FileData[] = [];

    for (const image of images) {
      setNotice(`正在处理图片: ${image.name}`);
      processedImages.push(await processFile(image));
    }

    for (const video of videos) {
      setNotice(`正在处理视频: ${video.name}`);
      processedVideos.push(await processFile(video));
    }

    return {
      ...data,
      data: {
        ...data.data,
        images: processedImages,
        videos: processedVideos,
      },
    };
  };

  const processPodcast = async (data: SyncData) => {
    setNotice('正在处理播客音频...');
    const { audio } = data.data as PodcastData;
    const processedAudio = await processFile(audio);
    return {
      ...data,
      data: {
        ...data.data,
        audio: processedAudio,
      },
    };
  };

  const processVideo = async (data: SyncData) => {
    setNotice('正在处理视频内容...');
    const { video } = data.data as VideoData;
    const processedVideo = await processFile(video);
    return {
      ...data,
      data: {
        ...data.data,
        video: processedVideo,
      },
    };
  };

  const handleRetry = async (platformName: string) => {
    setNotice(`正在重试发布到 ${platformName}...`);
    if (!processedData) return;

    // 更新平台状态为pending
    setPlatformStatuses((prev) =>
      prev.map((p) => (p.name === platformName ? { ...p, status: 'pending' as const, error: undefined } : p)),
    );

    // 只发布到指定平台
    const platformData = {
      ...processedData,
      platforms: processedData.platforms.filter((p) => p.name === platformName),
    };

    await focusMainWindow();
    chrome.runtime.sendMessage({
      action: 'MUTLIPOST_EXTENSION_PUBLISH_NOW',
      data: platformData,
    });

    setPlatformStatuses((prev) =>
      prev.map((p) => (p.name === platformName ? { ...p, status: 'success' as const, error: undefined } : p)),
    );
  };

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'MUTLIPOST_EXTENSION_PUBLISH_REQUEST_SYNC_DATA' }, async (response) => {
      const data = response.syncData as SyncData;
      if (!data) return setNotice('获取同步数据失败');
      setTitle(getTitleFromData(data));

      // 初始化平台状态
      setPlatformStatuses(
        data.platforms.map((p) => ({
          name: p.name,
          status: 'pending',
        })),
      );

      let processedData = data;

      try {
        if (data?.platforms.some((platform) => platform.name.includes('ARTICLE'))) {
          processedData = await processArticle(data);
        }

        if (data?.platforms.some((platform) => platform.name.includes('DYNAMIC'))) {
          processedData = await processDynamic(data);
        }

        if (data?.platforms.some((platform) => platform.name.includes('VIDEO'))) {
          processedData = await processVideo(data);
        }

        if (data?.platforms.some((platform) => platform.name.includes('PODCAST'))) {
          processedData = await processPodcast(data);
        }

        setProcessedData(processedData);
        setNotice('处理完成，准备发布...');

        console.log(processedData);

        setTimeout(async () => {
          await focusMainWindow();
          chrome.runtime.sendMessage({ action: 'MUTLIPOST_EXTENSION_PUBLISH_NOW', data: processedData });
          setIsProcessing(false);
          setNotice('发布完成');
          setPlatformStatuses((prev) => prev.map((p) => ({ ...p, status: 'success' })));
        }, 1000 * 1);
      } catch (error) {
        console.error('处理内容时出错:', error);
        setNotice('处理内容时出错，请重试');
        setIsProcessing(false);
      }
    });
  }, []);

  return (
    <HeroUIProvider>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-semibold text-center text-foreground">正在发布内容</h2>
          {title && <p className="text-sm text-center truncate text-muted-foreground">{title}</p>}
          <Progress
            value={isProcessing ? undefined : 100}
            isIndeterminate={isProcessing}
            aria-label={notice || '正在发布...'}
            className={`w-full ${isProcessing ? 'bg-green-500' : ''}`}
            size="sm"
          />
          {notice && <p className="text-sm text-center text-muted-foreground">{notice}</p>}

          <div className="space-y-2">
            {platformStatuses.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center justify-between p-2 rounded-lg bg-card">
                <div className="flex items-center space-x-2">
                  {platform.status === 'pending' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                  {platform.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {platform.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-sm font-medium">{infoMap[platform.name]?.platformName || platform.name}</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => handleRetry(platform.name)}
                  className="text-primary hover:text-primary-dark">
                  重试
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HeroUIProvider>
  );
}
