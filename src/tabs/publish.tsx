import '~style.css';
import React, { useEffect, useState, useRef } from 'react';
import { HeroUIProvider, Progress, Button, Switch, Tooltip, NumberInput } from '@heroui/react';
import { RefreshCw, X } from 'lucide-react';
import cssText from 'data-text:~style.css';
import {
  type ArticleData,
  type DynamicData,
  type FileData,
  type PodcastData,
  type SyncData,
  type VideoData,
  type SyncDataPlatform,
  injectScriptsToTabs,
} from '~sync/common';
import { Storage } from '@plasmohq/storage';

const storage = new Storage({
  area: 'local',
});
const AUTO_CLOSE_KEY = 'publish-auto-close';
const AUTO_CLOSE_DELAY_KEY = 'publish-auto-close-delay';
const SYNC_CLOSE_TABS_KEY = 'publish-sync-close-tabs';
const DEFAULT_AUTO_CLOSE_DELAY = 3 * 60; // 3 minutes in seconds

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
  const [data, setData] = useState<SyncData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [publishedTabs, setPublishedTabs] = useState<
    Array<{
      tab: chrome.tabs.Tab;
      platformInfo: SyncDataPlatform;
    }>
  >([]);
  const [autoClose, setAutoClose] = useState(true);
  const [syncCloseTabs, setSyncCloseTabs] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [autoCloseDelay, setAutoCloseDelay] = useState<number>(DEFAULT_AUTO_CLOSE_DELAY);
  const autoCloseTimerRef = useRef<number>();
  const countdownTimerRef = useRef<number>();
  const sysnCloseTabsRef = useRef<boolean>(false);
  const publishedTabsRef = useRef<Array<{
    tab: chrome.tabs.Tab;
    platformInfo: SyncDataPlatform;
  }>>([]);

  async function processArticle(data: SyncData): Promise<SyncData> {
    setNotice(chrome.i18n.getMessage('processingContent'));
    const parser = new DOMParser();
    const { htmlContent, markdownContent, images, cover } = data.data as ArticleData;
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const imgElements = Array.from(doc.getElementsByTagName('img')) as HTMLImageElement[];
    const blobUrls: string[] = [];

    const processedImages: FileData[] = [];
    let processedHtmlContent = htmlContent;
    let processedMarkdownContent = markdownContent;
    let processedCoverImage: FileData | null = null;

    // 处理所有图片
    if (Array.isArray(imgElements) && imgElements.length > 0) {
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
          setNotice(chrome.i18n.getMessage('errorProcessImage', [img.src]));
          setErrors((prev) => [...prev, chrome.i18n.getMessage('errorProcessImage', [img.src])]);
        }
      }
    }

    if (cover) {
      processedCoverImage = await processFile(cover);
    }

    processedHtmlContent = doc.documentElement.outerHTML;

    return {
      ...data,
      data: {
        ...data.data,
        htmlContent: processedHtmlContent,
        markdownContent: processedMarkdownContent,
        images: processedImages,
        cover: processedCoverImage || cover,
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
      setErrors((prev) => [...prev, chrome.i18n.getMessage('errorProcessFile', [file.name])]);
      return file;
    }
  };

  const processDynamic = async (data: SyncData) => {
    setNotice(chrome.i18n.getMessage('processingContent'));
    const { images = [], videos = [] } = data.data as DynamicData;

    const processedImages: FileData[] = [];
    const processedVideos: FileData[] = [];

    // 确保 images 是可迭代的数组
    if (Array.isArray(images) && images.length > 0) {
      for (const image of images) {
        setNotice(chrome.i18n.getMessage('errorProcessImage', [image.name]));
        processedImages.push(await processFile(image));
      }
    } else {
      console.warn('images 不是一个数组或可迭代对象', images);
    }

    // 确保 videos 是可迭代的数组
    if (Array.isArray(videos) && videos.length > 0) {
      for (const video of videos) {
        setNotice(chrome.i18n.getMessage('errorProcessFile', [video.name]));
        processedVideos.push(await processFile(video));
      }
    } else {
      console.warn('videos 不是一个数组或可迭代对象', videos);
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
    setNotice(chrome.i18n.getMessage('processingContent'));
    const { audio } = data.data as PodcastData;

    if (!audio) {
      console.warn('音频数据不存在');
      return data;
    }

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
    setNotice(chrome.i18n.getMessage('processingContent'));
    const { video } = data.data as VideoData;

    if (!video) {
      console.warn('视频数据不存在');
      return data;
    }

    const processedVideo = await processFile(video);
    return {
      ...data,
      data: {
        ...data.data,
        video: processedVideo,
      },
    };
  };

  const handleReloadTab = async (tabId: number) => {
    try {
      const tabInfo = publishedTabs.find((t) => t.tab.id === tabId);
      if (!tabInfo) {
        console.error('找不到要重新加载的标签页信息');
        return;
      }

      // 更新标签页 URL
      const updatedTab = await chrome.tabs.update(tabId, {
        url: tabInfo.platformInfo.injectUrl,
        active: true,
      });

      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      // 注入脚本
      await injectScriptsToTabs(
        [
          {
            tab: updatedTab,
            platformInfo: tabInfo.platformInfo,
          },
        ],
        data,
      );

      // 更新本地状态
      setPublishedTabs((prev) => prev.map((item) => (item.tab.id === tabId ? { ...item, tab: updatedTab } : item)));
      publishedTabsRef.current = publishedTabsRef.current.map((t) => (t.tab.id === tabId ? { ...t, tab: updatedTab } : t));
    } catch (error) {
      console.error('重新加载标签页失败:', error);
      setErrors((prev) => [...prev, chrome.i18n.getMessage('errorReloadTab', [error.message || '未知错误'])]);
    }
  };

  const handleTabClick = (tabId: number) => {
    chrome.tabs.update(tabId, { active: true });
  };

  const handleTabMiddleClick = (e: React.MouseEvent<HTMLButtonElement>, tabId: number) => {
    if (e.button === 1 || e.buttons === 4) {
      e.preventDefault();
      handleCloseTab(tabId);
    }
  };

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId);
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      setPublishedTabs((prev) => prev.filter((t) => t.tab.id !== tabId));
      publishedTabsRef.current = publishedTabsRef.current.filter((t) => t.tab.id !== tabId);
    } catch (error) {
      console.error('关闭标签页失败:', error);
      setErrors((prev) => [...prev, chrome.i18n.getMessage('errorCloseTab', [error.message || '未知错误'])]);
    }
  };

  const handleCloseAllTabs = async () => {
    try {
      const tabIds = publishedTabsRef.current.map((tab) => tab.tab.id).filter((id): id is number => id !== undefined);
      if (tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
      }
      setPublishedTabs([]);
      publishedTabsRef.current = [];
    } catch (error) {
      console.error('关闭所有标签页失败:', error);
      setErrors((prev) => [...prev, chrome.i18n.getMessage('errorCloseAllTabs', [error.message || '未知错误'])]);
    }
  };

  const handleCloseWindow = () => {
    window.close();
  };

  const handleAutoCloseChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    // 切换 autoClose 时清除之前的定时器
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setAutoClose(checked);
    await storage.set(AUTO_CLOSE_KEY, String(checked));

    if (checked) {
      // 如果开启了自动关闭，立即启动新的定时器
      console.log('用户开启自动关闭，启动定时器');
      startAutoCloseTimer();
    } else {
      // 如果关闭了自动关闭，清除倒计时
      console.log('用户关闭自动关闭，清除倒计时');
      setCountdown(0);
    }
  };

  const handleDelayChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(event.target.value);
    if (isNaN(minutes) || minutes < 1) return;

    const seconds = minutes * 60;
    setAutoCloseDelay(seconds);
    await storage.set(AUTO_CLOSE_DELAY_KEY, String(seconds));

    // 如果当前正在倒计时，重新启动定时器
    if (autoClose && countdown > 0) {
      console.log('用户修改延迟时间，重新启动定时器:', seconds, '秒');
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      startAutoCloseTimer(seconds);
    }
  };

  const startAutoCloseTimer = (delaySeconds?: number) => {
    const delay = delaySeconds || autoCloseDelay;
    console.log('startAutoCloseTimer 被调用，延迟时间:', delay, '秒');
    // 清除之前的定时器
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // 设置倒计时
    console.log('设置倒计时:', delay, '秒');
    setCountdown(delay);

    // 倒计时更新
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 自动关闭定时器
    autoCloseTimerRef.current = window.setTimeout(async () => {
      if (sysnCloseTabsRef.current) {
        await handleCloseAllTabs();
      }
      window.close();
    }, delay * 1000);
  };

  const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    setPublishedTabs((prev) => prev.map((item) => (item.tab.id === tabId ? { ...item, tab } : item)));
    publishedTabsRef.current = publishedTabsRef.current.map((t) => (t.tab.id === tabId ? { ...t, tab } : t));
  };

  const handleTabRemoved = (tabId: number) => {
    setPublishedTabs((prev) => prev.filter((tab) => tab.tab.id !== tabId));
    publishedTabsRef.current = publishedTabsRef.current.filter((t) => t.tab.id !== tabId);
  };

  const handleSyncCloseTabsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSyncCloseTabs(checked);
    sysnCloseTabsRef.current = checked;
    await storage.set(SYNC_CLOSE_TABS_KEY, String(checked));
  };

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // 初始化自动关闭设置并启动倒计时
  useEffect(() => {
    Promise.all([
      storage.get(AUTO_CLOSE_KEY),
      storage.get(AUTO_CLOSE_DELAY_KEY),
      storage.get(SYNC_CLOSE_TABS_KEY),
    ]).then(([autoCloseValue, delayValue, syncCloseTabsValue]) => {
      const shouldAutoClose = autoCloseValue === undefined ? true : autoCloseValue === 'true';
      const delaySeconds = delayValue === undefined ? DEFAULT_AUTO_CLOSE_DELAY : parseInt(delayValue);
      const shouldSyncCloseTabs = syncCloseTabsValue === undefined ? false : syncCloseTabsValue === 'true';

      console.log(
        '初始化 autoClose:',
        shouldAutoClose,
        '延迟时间:',
        delaySeconds,
        '秒',
        'syncCloseTabs:',
        shouldSyncCloseTabs,
      );
      setAutoClose(shouldAutoClose);
      setAutoCloseDelay(delaySeconds);
      setSyncCloseTabs(shouldSyncCloseTabs);
      sysnCloseTabsRef.current = shouldSyncCloseTabs;

      // 如果启用自动关闭，立即启动倒计时，传入从存储读取的延迟时间
      if (shouldAutoClose) {
        console.log('页面加载时启动自动关闭定时器，使用延迟时间:', delaySeconds, '秒');
        startAutoCloseTimer(delaySeconds);
      }
    });
  }, []);

  // 发布完成后的处理逻辑
  const handlePublishComplete = async (response: {
    tabs?: Array<{ tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }>;
  }) => {
    setIsProcessing(false);
    setNotice(chrome.i18n.getMessage('publishComplete'));

    // 存储返回的 tabs 数据
    if (response?.tabs) {
      // 获取最新的 tab 信息
      const updatedTabs = await Promise.all(
        response.tabs.map(async (tabInfo) => {
          try {
            if (tabInfo.tab.id) {
              const updatedTab = await chrome.tabs.get(tabInfo.tab.id);
              return {
                ...tabInfo,
                tab: updatedTab,
              };
            }
            return tabInfo;
          } catch (error) {
            console.error('获取标签页信息失败:', error);
            return tabInfo;
          }
        }),
      );
      setPublishedTabs(updatedTabs);
      publishedTabsRef.current = updatedTabs;
    }

    // 发布完成，倒计时已经在页面加载时启动
    console.log('发布完成');
  };

  useEffect(() => {
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);
    chrome.runtime.sendMessage({ action: 'MUTLIPOST_EXTENSION_PUBLISH_REQUEST_SYNC_DATA' }, async (response) => {
      console.log(response);
      const data = response.syncData as SyncData;
      if (!data) return setNotice(chrome.i18n.getMessage('errorGetSyncData'));
      setTitle(getTitleFromData(data));

      let processedData = data;
      processedData.origin = data.data;

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

        setData(processedData);
        setNotice(chrome.i18n.getMessage('processingComplete'));

        console.log(processedData);

        setTimeout(async () => {
          await focusMainWindow();
          chrome.runtime.sendMessage(
            { action: 'MUTLIPOST_EXTENSION_PUBLISH_NOW', data: processedData },
            handlePublishComplete,
          );
        }, 1000 * 1);
      } catch (error) {
        console.error('处理内容时出错:', error);
        setNotice(chrome.i18n.getMessage('errorProcessContent'));
        setIsProcessing(false);
      }
    });

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
    };
  }, []);

  return (
    <HeroUIProvider>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-semibold text-center text-foreground">{chrome.i18n.getMessage('publishing')}</h2>
          {title && <p className="text-sm text-center truncate text-muted-foreground">{title}</p>}
          <Progress
            value={isProcessing ? undefined : 100}
            isIndeterminate={isProcessing}
            aria-label={notice || chrome.i18n.getMessage('publishingInProgress')}
            className={`w-full ${isProcessing ? 'bg-green-500' : ''}`}
            size="sm"
          />
          {notice && <p className="text-sm text-center text-muted-foreground">{notice}</p>}

          {/* 调试信息 */}
          {/* <div className="text-xs text-center text-gray-400">
            Debug: isProcessing={isProcessing.toString()}, autoClose={autoClose.toString()}, countdown={countdown}
          </div> */}

          {errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">{chrome.i18n.getMessage('errorMessages')}</p>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            {publishedTabs.length > 0 &&
              publishedTabs.map((tab) => {
                return (
                  <div
                    key={tab.tab.id}
                    className="mb-6">
                    <ul className="space-y-2">
                      <li
                        key={tab.tab.id}
                        className="relative flex items-center">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="mr-2"
                          onPress={() => handleReloadTab(tab.tab.id)}
                          aria-label={chrome.i18n.getMessage('sidepanelReloadTab')}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          className="justify-start pl-2 pr-10 text-left grow"
                          onPress={() => handleTabClick(tab.tab.id)}
                          onMouseDown={(e) => handleTabMiddleClick(e, tab.tab.id)}>
                          {tab.tab.favIconUrl && (
                            <img
                              src={tab.tab.favIconUrl}
                              alt=""
                              className="w-4 h-4 mr-2 shrink-0"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          )}
                          <span className="truncate">{tab.tab.title || tab.tab.url}</span>
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="light"
                          className="absolute -translate-y-1/2 right-2 top-1/2"
                          onPress={() => handleCloseTab(tab.tab.id)}
                          aria-label={chrome.i18n.getMessage('sidepanelCloseTab')}>
                          <X className="w-4 h-4" />
                        </Button>
                      </li>
                    </ul>
                  </div>
                );
              })}
          </div>
          {/* 自动关闭设置和倒计时 */}
          <div className="px-3 py-2 space-y-3 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tooltip
                  content="You can set a suitable delay for different social media platforms when automating"
                  placement="top"
                  className="max-w-xs">
                  <Switch
                    isSelected={autoClose}
                    onChange={handleAutoCloseChange}
                    size="sm"
                    className="data-[state=checked]:bg-primary-600 cursor-help">
                    <span className="text-sm text-gray-700">{chrome.i18n.getMessage('publishAutoClose')}</span>
                  </Switch>
                </Tooltip>
                {autoClose && (
                  <div className="flex items-center gap-1 ml-2">
                    <NumberInput
                      hideStepper
                      size="sm"
                      variant="underlined"
                      min="1"
                      max="30"
                      // defaultValue={Math.floor(autoCloseDelay / 60)}
                      value={Math.floor(autoCloseDelay / 60)}
                      onChange={(e) => handleDelayChange(e)}
                      className="w-14"
                    />
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                )}
              </div>
              {autoClose && countdown > 0 && (
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-orange-700">
                    {chrome.i18n.getMessage('publishAutoCloseCountdown', [countdown.toString()])}
                  </span>
                </div>
              )}
            </div>

            {/* 同步关闭标签页设置 - 只在启用自动关闭时显示 */}
            {autoClose && (
              <div className="flex items-center">
                <Tooltip
                  content="When enabled, closing the publish window will also close all opened platform tabs"
                  placement="top"
                  className="max-w-xs">
                  <Switch
                    isSelected={syncCloseTabs}
                    onChange={handleSyncCloseTabsChange}
                    size="sm"
                    className="data-[state=checked]:bg-primary-600 cursor-help">
                    <span className="text-sm text-gray-700">同步关闭标签页</span>
                  </Switch>
                </Tooltip>
              </div>
            )}
          </div>

          {!isProcessing && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                color="primary"
                variant="solid"
                onPress={handleCloseWindow}
                className="flex-1">
                {chrome.i18n.getMessage('finishPublishing')}
              </Button>
              <Button
                color="danger"
                variant="solid"
                onPress={async () => {
                  await handleCloseAllTabs();
                  handleCloseWindow();
                }}
                className="flex-1">
                {chrome.i18n.getMessage('finishAndCloseTabs')}
              </Button>
            </div>
          )}
        </div>

        {/* Contact us footer tip */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            {chrome.i18n.getMessage('contactUsIfProblem')}
            <a
              href="https://docs.multipost.app/docs/user-guide/contact-us"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-600">
              Contact Us
            </a>
          </p>
        </div>
      </div>
    </HeroUIProvider>
  );
}
