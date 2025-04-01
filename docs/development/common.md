# 通用功能开发记录

在本记录中，我们记录了开发过程中一些通用功能的实现，例如发布、标签页管理、脚本注入等。

## 基础类型

首先我们定义了一系列类型，作为扩展发布内容的通信基础。

```typescript
// SyncData 是最外层的数据，用于组织每一次的发布行为
export interface SyncData {
  platforms: string[]; // 需要发布的平台，为平台名称的数组
  auto_publish: boolean; // 是否自动发布
  data: DynamicData | ArticleData | VideoData; // 发布的数据，根据平台类型不同，数据类型不同
}

// FileData 是文件数据，用于组织文件数据
export interface FileData {
  name: string; // 文件名
  url: string; // 文件链接，一般为 blob 链接，扩展的脚本允许从任意 blob 链接中下载文件
  type: string; // 文件类型
  size: number; // 文件大小
  base64?: string; // 文件 base64 编码，该字段应弃用，base64的转换性能问题很大
  originUrl?: string; // 文件原始链接，一般用于存储 https 来源的文件原 Url
}

// DynamicData 是动态发布的数据，用于组织动态发布的数据
export interface DynamicData {
  title: string; // 标题
  content: string; // 内容
  images: FileData[]; // 图片
  videos: FileData[]; // 视频，该字段目前仅用于某些允许同时发布图片和视频的平台，例如 Instagram、 X 等
}

// ArticleData 是文章发布的数据，用于组织文章发布的数据
// 在发布的时候根据平台需要，使用 HTML 或者 Markdown 格式内容进行发布处理
export interface ArticleData {
  title: string; // 标题
  content: string; // 内容 HTML
  digest: string; // 摘要
  cover: FileData; // 封面
  images: FileData[]; // 图片
  videos: FileData[]; // 视频
  fileDatas: FileData[]; // 文件
  originContent?: string; // 原始内容 HTML
  markdownContent?: string; // 转换后的 markdown 内容
  markdownOriginContent?: string; // 原始 markdown 内容
}

// VideoData 是视频发布的数据，用于组织视频发布的数据
export interface VideoData {
  title: string; // 标题
  content: string; // 内容 HTML
  video: FileData; // 视频
}

// PlatformInfo 是平台信息，用于组织平台信息
export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO' | 'ARTICLE'; // 平台类型
  name: string; // 平台名称
  homeUrl: string; // 平台首页
  faviconUrl?: string; // 平台图标
  iconifyIcon?: string; // 平台图标
  platformName: string; // 平台名称
  username?: string; // 用户名
  userAvatarUrl?: string; // 用户头像
  injectUrl: string; // 平台发布页面
  injectFunction: (data: SyncData) => Promise<void>; // 平台发布函数
  tags?: string[]; // 平台标签
  accountKey: string; // 平台账号标识
  accountInfo?: AccountInfo; // 平台账号信息
}

// AccountInfo 是账号信息，用于组织账号信息
export interface AccountInfo {
  provider: string; // 账号提供商
  accountId: string; // 账号 ID
  username: string; // 账号名称
  description?: string; // 账号描述
  profileUrl?: string; // 账号链接
  avatarUrl?: string; // 账号头像
  extraData: unknown; // 账号额外数据
}
```

## 发布过程

在 `src/components/Sync` 文件夹中，有对应不同平台的发布组件，例如 `DynamicTab`、`ArticleTab`、`VideoTab` 等。

它们在组织好发布所需的信息，即 `SyncData` 类型的数据后，会调用 `src/options/index.tsx` 文件中的 `funcPublish` 函数来进行标签页的创建和脚本的注入。

```ts
const funcPublish = async (data: SyncData) => {
  // 如果平台数组不为空，则创建标签页
  if (Array.isArray(data.platforms) && data.platforms.length > 0) {
    // 创建标签页
    createTabsForPlatforms(data)
      .then(async (tabs) => {
        // 注入脚本
        injectScriptsToTabs(tabs, data);

        // 通知标签页管理器新建了新的标签页
        // 这里会触发 `src/background/services/tabs.ts` 文件中的 `tabsManagerMessageHandler` 函数
        chrome.runtime.sendMessage({
          type: 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS',
          data: data,
          tabs: tabs,
        });

        // 依次激活标签页，以便注入的脚本可以正常工作
        for (const [tab] of tabs) {
          if (tab.id) {
            await chrome.tabs.update(tab.id, { active: true });
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      })
      .catch((error) => {
        console.error('Error creating tabs or groups:', error);
      });
  } else {
    console.error('No valid platforms specified');
  }
};
```

## 创建标签页与脚本注入

在上一节，我们看到 `funcPublish` 函数会调用 `createTabsForPlatforms` 函数来创建标签页，并调用 `injectScriptsToTabs` 函数来注入脚本。这两个函数在 `src/sync/common.ts` 文件中。

它的原理是使用了 `chrome.tabs` 和 `chrome.scripting` 的 API 来创建标签页和注入脚本。

```ts
// 平台信息映射，因为定义的类型比较多，所以拆分成了多个文件 article.ts、dynamic.ts、video.ts
export const infoMap: Record<string, PlatformInfo> = {
  ...DynamicInfoMap,
  ...ArticleInfoMap,
  ...VideoInfoMap,
};

// 获取平台信息
export function getDefaultPlatformInfo(platform: string): PlatformInfo | null {
  return infoMap[platform] || null;
}

// 创建标签页
export async function createTabsForPlatforms(data: SyncData) {
  const tabs = [];
  // 从 SyncData 中获取需要发布的平台
  for (const platform of data.platforms) {
    // 获取平台信息
    const info = getDefaultPlatformInfo(platform);
    if (info) {
      // 创建标签页
      const tab = await chrome.tabs.create({ url: info.injectUrl });
      // 将标签页和平台信息推入数组
      tabs.push([tab, platform]);
    }
  }

  // 创建标签页组
  const groupId = await chrome.tabs.group({ tabIds: tabs.map((t) => t[0].id!) });
  const group = await chrome.tabGroups.get(groupId);

  // 更新标签页组的标题和颜色
  await chrome.tabGroups.update(group.id, {
    color: 'blue',
    title: `MultiPost-${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
  });

  return tabs;
}

// 注入脚本
export async function injectScriptsToTabs(tabs: [chrome.tabs.Tab, string][], data: SyncData) {
  // 遍历标签页
  for (const t of tabs) {
    // 获取标签页和平台信息
    const tab = t[0];
    const platform = t[1];
    // 如果标签页 ID 存在，则添加监听器
    if (tab.id) {
      // 添加监听器
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        // 如果标签页 ID 和平台信息匹配，则注入脚本
        if (tabId === tab.id && info.status === 'complete') {
          // 移除监听器
          chrome.tabs.onUpdated.removeListener(listener);
          // 获取平台信息
          const info = getDefaultPlatformInfo(platform);
          // 如果平台信息存在，则注入脚本
          if (info) {
            // 注入脚本
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: info.injectFunction,
              args: [data],
            });
          }
        }
      });
    }
  }
}
```

## 平台账号信息

为了能让用户得知他们在发布内容时使用的平台账号信息，我们设计获取了平台账号信息，并将平台信息存储到 `localStorage` 中。

具体实现在 `src/sync/account.ts` 文件以及 `src/sync/account` 文件夹中。

首先我们为 `PlatformInfo` 类型添加了 `accountKey` 和 `accountInfo` 字段，用于在前端请求平台数据时附加平台账号信息。

然后我们需要获取这些平台账号信息，并将其存储到 `localStorage` 中。

```ts
/**
 * 获取指定平台账号的最新信息
 * @param accountKey 账号标识符
 * @returns 返回账号信息
 */
export async function refreshAccountInfo(accountKey: string): Promise<AccountInfo> {
  // 获取平台信息
  const platformInfos = getPlatformInfos();
  // 获取指定平台账号信息
  const platformInfo = platformInfos.find((p) => p.accountKey === accountKey);
  // 如果找不到指定平台账号信息，则抛出错误
  if (!platformInfo) {
    throw new Error(`找不到账号信息: ${accountKey}`);
  }

  let accountInfo: AccountInfo;

  // 根据平台类型获取账号信息，具体的函数实现在 `src/sync/account` 文件夹中
  if (accountKey === 'x') {
    accountInfo = await getXAccountInfo();
  } else if (accountKey === 'tiktok') {
    accountInfo = await getTiktokAccountInfo();
  } else if (accountKey === 'douyin') {
    accountInfo = await getDouyinAccountInfo();
  } else if (accountKey === 'rednote') {
    accountInfo = await getRednoteAccountInfo();
  } else if (accountKey === 'bilibili') {
    accountInfo = await getBilibiliAccountInfo();
  } else {
    return null;
  }

  if (!accountInfo) {
    console.error(`获取账号信息失败: ${accountKey}`);
    removeAccountInfo(accountKey);
    return null;
  }

  // 更新平台信息并保存到storage
  await saveAccountInfo(accountKey, accountInfo);

  return accountInfo;
}

/**
 * 刷新所有平台的账号信息
 * @returns 所有账号信息的映射表
 */

// 该函数在 `src/options/index.tsx` 文件中被调用，即在用户打开选项页时，会调用该函数来获取平台账号信息
export async function refreshAllAccountInfo(): Promise<Record<string, AccountInfo>> {
  // 获取所有平台信息
  const platformInfos = getPlatformInfos();
  const results: Record<string, AccountInfo> = {};
  const errors: Record<string, Error> = {};

  // 并行刷新所有账号信息
  await Promise.allSettled(
    platformInfos.map(async (platformInfo) => {
      try {
        if (platformInfo.accountKey) {
          const accountInfo = await refreshAccountInfo(platformInfo.accountKey);
          results[platformInfo.accountKey] = accountInfo;
        }
      } catch (error) {
        console.error(`刷新账号信息失败: ${platformInfo.accountKey}`, error);
        errors[platformInfo.accountKey] = error as Error;
      }
    }),
  );

  // 如果所有请求都失败了，抛出错误
  if (Object.keys(results).length === 0 && Object.keys(errors).length > 0) {
    throw new Error('所有账号信息刷新失败');
  }

  return results;
}
```

## Scraper

在 `src/contents/scraper.ts` 文件中，我们定义了 `scraper` 的逻辑，用于文章发布的时候获取网页内容。

同样，我们会监听来自 `Options` 页面的消息，当用户在 `Article` 标签页中点击 `获取内容` 按钮时，会触发该消息，并调用 `scrapeContent` 函数来获取网页内容。

```ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MUTLIPOST_EXTENSION_REQUEST_SCRAPER_START') {
    const scrapeFunc = async () => {
      const articleData = await scrapeContent();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sendResponse(articleData);
    };
    // 平滑滚动到页面底部
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });

    // 监听滚动完成事件
    const checkScrollEnd = () => {
      if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 2) {
        // 滚动完成，发送响应
        scrapeFunc();
      }
    };

    window.addEventListener('scroll', checkScrollEnd);

    // 设置超时，以防滚动没有触发完成事件
    setTimeout(() => {
      window.removeEventListener('scroll', checkScrollEnd);
      scrapeFunc();
    }, 5000); // 5秒后超时
  }
  return true; // 保持消息通道开放
});
```

默认我们会使用 `defaultScraper` 函数来获取网页内容，其次它会根据网页的 URL 来判断使用哪个 `scraper` 函数。

例如 `https://blog.csdn.net/` 会使用 `scrapeCSDNContent` 函数来获取网页内容。

```ts
export default async function scrapeContent(): Promise<ArticleData | undefined> {
  const url = window.location.href;

  // 针对不同网址开头使用不同的scraper
  const scraperMap: { [key: string]: () => Promise<ArticleData | undefined> } = {
    'https://blog.csdn.net/': scrapeCSDNContent,
    'https://zhuanlan.zhihu.com/p/': scrapeZhihuContent,
    'https://mp.weixin.qq.com/s/': scrapeWeixinContent,
    'https://juejin.cn/post/': scrapeJuejinContent,
    'https://www.jianshu.com/p/': scrapeJianshuContent,
  };

  const scraper = Object.keys(scraperMap).find((key) => url.startsWith(key));
  if (scraper) {
    return scraperMap[scraper]();
  }

  return defaultScraper();
}
```

以 `CSDN` 为例，我们使用 `scrapeCSDNContent` 函数来获取网页内容。其原理是使用 `Readability` 库来获取网页内容，并使用 `preprocessor` 函数来处理网页内容，最后根据不同类型网站的特性，使用不同的选择器来获取文章标题、作者、封面、内容、摘要等信息。

```ts
export default async function scrapeCSDNContent(): Promise<ArticleData | undefined> {
  console.debug('CSDN spider ...');

  const preprocess = (content: string) => preprocessor(content);

  // 获取文章标题
  const title = document.querySelector('h1.title-article')?.textContent || '';
  
  // 获取作者信息
  const author = document.querySelector('a.follow-nickName')?.textContent || '';
  
  // 获取封面图
  const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  
  // 获取文章内容
  const content = document.querySelector('div#content_views')?.innerHTML || '';
  
  // 获取文章摘要
  const digest = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

  if (!title || !content) {
    console.log('failedToGetArticleContent');
    return;
  }

  const articleData: ArticleData = {
    title: title.trim(),
    author: author.trim(),
    cover,
    content: preprocess(content.trim()),
    digest: digest.trim()
  };

  return articleData;
} 
```

## Background

在 `src/background/index.ts` 文件中，我们定义了 `background` 的逻辑，例如标签页管理、消息处理等。

监听消息，通过 `defaultMessageHandler` 函数来处理消息，通过 `tabsManagerMessageHandler` 函数来处理标签页管理消息，通过 `trustDomainMessageHandler` 函数来处理信任域消息。

浏览器扩展通过 `chrome.runtime.onMessage` 来监听消息，可以接受来自 `content script` 的消息，也可以接受来自 `options` 页面的消息。

同时我们监听了标签页的更新和删除事件，用于标签页管理，当用户使用浏览器的标签页管理功能时，会触发这些事件，将更新的信息传递到我们来处理，例如重新加载、关闭、刷新等。以同步标签页在 `Sidepanel` 中的状态。

```ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  defaultMessageHandler(request, sender, sendResponse);
  tabsManagerMessageHandler(request, sender, sendResponse);
  trustDomainMessageHandler(request, sender, sendResponse);
  return true;
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  tabsManagerHandleTabUpdated(tabId, changeInfo, tab);
});

// 监听标签页删除
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsManagerHandleTabRemoved(tabId);
});
```

保活机制是为了能够保持 Background 在浏览器后台持续运行，防止被浏览器杀死。

```ts
// Keep Alive || 保活机制 || START
const quantumKeepAlive = new QuantumEntanglementKeepAlive();
quantumKeepAlive.startEntanglementProcess();
// Keep Alive || 保活机制 || END
```

## 标签页管理（用于 Sidepanel）

接下来是标签页管理，在 `src/background/services/tabs.ts` 文件中。

标签页管理主要是为了在标签页创建后允许用户通过 Sidepanel 来管理标签页，例如重新加载、关闭、刷新等。

```ts
import { injectScriptsToTabs, type SyncData } from '~sync/common';
import { getDefaultPlatformInfo } from '~sync/common';

// 定义了标签页管理使用的类型
export interface TabManagerMessage {
  // 发布信息
  syncData: SyncData;
  // 标签页信息
  tabs: {
    tab: chrome.tabs.Tab;
    platform: string;
  }[];
}

// 标签页管理消息数组
const tabsManagerMessages: TabManagerMessage[] = [];

// 处理标签页更新
const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  tabsManagerMessages.forEach((group, index) => {
    const updatedTabs = group.tabs.map((item) => (item.tab.id === tabId ? { ...item, tab } : item));
    tabsManagerMessages[index] = { ...group, tabs: updatedTabs };
  });
};

// 处理标签页删除
const handleTabRemoved = (tabId: number) => {
  tabsManagerMessages.forEach((group, index) => {
    const filteredTabs = group.tabs.filter((item) => item.tab.id !== tabId);
    tabsManagerMessages[index] = { ...group, tabs: filteredTabs };
  });
};

// 获取标签页管理消息
export const getTabsManagerMessages = () => {
  return tabsManagerMessages;
};

// 添加标签页管理消息
export const addTabsManagerMessages = (data: TabManagerMessage) => {
  tabsManagerMessages.push(data);
};

// 标签页更新处理
export const tabsManagerHandleTabUpdated = handleTabUpdated;
// 标签页删除处理
export const tabsManagerHandleTabRemoved = handleTabRemoved;
// 标签页管理消息处理
export const tabsManagerMessageHandler = (request, sender, sendResponse) => {
  // 重新加载标签页
  if (request.type === 'MUTLIPOST_EXTENSION_REQUEST_PUBLISH_RELOAD') {
    const { tabId, tabGroup } = request.data;
    const tabInfo = tabGroup.tabs.find((t) => t.tab.id === tabId);

    // 如果标签页信息存在，则获取平台信息
    if (tabInfo) {
      const platformInfo = getDefaultPlatformInfo(tabInfo.platform);

      // 如果平台信息存在，则更新标签页 URL 并注入脚本
      if (platformInfo) {
        chrome.tabs.update(tabId, { url: platformInfo.injectUrl, active: true }).then(() => {
          injectScriptsToTabs([[tabInfo.tab, tabInfo.platform]], tabGroup.syncData);
        });
      } else {
        console.error(`无法获取平台 ${tabInfo.platform} 的信息`);
        sendResponse('error');
        return;
      }
    } else {
      console.error(`未找到标签页 ID ${tabId} 的信息`);
      sendResponse('error');
      return;
    }
    sendResponse('success');
  }
  // 获取标签页管理消息
  if (request.type === 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_TABS') {
    sendResponse(getTabsManagerMessages());
  }
  // 添加标签页管理消息
  if (request.type === 'MUTLIPOST_EXTENSION_TABS_MANAGER_REQUEST_ADD_TABS') {
    const { data, tabs } = request;
    addTabsManagerMessages({
      syncData: data,
      tabs: tabs.map((t: [chrome.tabs.Tab, string]) => ({
        tab: t[0],
        platform: t[1],
      })),
    });
    sendResponse('success');
  }
};
```

具体使用该功能的位置在 `src/components/Sidepanel/Tabs/TabsManager.tsx` 文件中。



