import { getAccountInfoFromPlatformInfo, getAccountInfoFromPlatformInfos } from './account';
import { ArticleInfoMap } from './article';
import { DynamicInfoMap } from './dynamic';
import { getExtraConfigFromPlatformInfo, getExtraConfigFromPlatformInfos } from './extraconfig';
import { PodcastInfoMap } from './podcast';
import { VideoInfoMap } from './video';

export interface SyncDataPlatform {
  name: string;
  injectUrl?: string;
  extraConfig?:
    | {
        customInjectUrls?: string[]; // Beta 功能，用于自定义注入 URL
      }
    | unknown;
}

export interface SyncData {
  platforms: SyncDataPlatform[];
  isAutoPublish: boolean;
  data: DynamicData | ArticleData | VideoData | PodcastData;
  origin?: DynamicData | ArticleData | VideoData | PodcastData; // Beta 功能，用于临时存储，发布时不需要提供该字段
}

export interface DynamicData {
  title: string;
  content: string;
  images: FileData[];
  videos: FileData[];
}

export interface PodcastData {
  title: string;
  description: string;
  audio: FileData;
}

export interface FileData {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface ArticleData {
  title: string;
  digest: string;
  cover: FileData;
  htmlContent: string;
  markdownContent: string;
  images?: FileData[]; // 发布时可不提供该字段
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
}

export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  iconifyIcon?: string;
  platformName: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
  tags?: string[];
  accountKey: string;
  accountInfo?: AccountInfo;
  extraConfig?: unknown;
}

export interface AccountInfo {
  provider: string;
  accountId: string;
  username: string;
  description?: string;
  profileUrl?: string;
  avatarUrl?: string;
  extraData: unknown;
}

export const infoMap: Record<string, PlatformInfo> = {
  ...DynamicInfoMap,
  ...ArticleInfoMap,
  ...VideoInfoMap,
  ...PodcastInfoMap,
};

export async function getPlatformInfo(platform: string): Promise<PlatformInfo | null> {
  const platformInfo = infoMap[platform];
  if (platformInfo) {
    return await getExtraConfigFromPlatformInfo(await getAccountInfoFromPlatformInfo(platformInfo));
  }
  return null;
}

export function getRawPlatformInfo(platform: string): PlatformInfo | null {
  return infoMap[platform];
}

export async function getPlatformInfos(type?: 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST'): Promise<PlatformInfo[]> {
  const platformInfos: PlatformInfo[] = [];
  for (const info of Object.values(infoMap)) {
    if (type && info.type !== type) continue;
    platformInfos.push(info);
  }

  return await getExtraConfigFromPlatformInfos(await getAccountInfoFromPlatformInfos(platformInfos));
}

// Inject || 注入 || START
export async function createTabsForPlatforms(data: SyncData) {
  const tabs: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }[] = [];
  for (const info of data.platforms) {
    if (info) {
      const extraConfig = info.extraConfig as { customInjectUrls?: string[] };
      if (extraConfig?.customInjectUrls && extraConfig.customInjectUrls.length > 0) {
        for (const url of extraConfig.customInjectUrls) {
          const tab = await chrome.tabs.create({ url });
          info.injectUrl = url;
          tabs.push({
            tab,
            platformInfo: info,
          });
        }
      } else {
        if (info.injectUrl) {
          const tab = await chrome.tabs.create({ url: info.injectUrl });
          tabs.push({
            tab,
            platformInfo: info,
          });
        } else {
          const platformInfo = infoMap[info.name];
          if (platformInfo) {
            const tab = await chrome.tabs.create({ url: platformInfo.homeUrl });
            tabs.push({
              tab,
              platformInfo: info,
            });
          }
        }
      }
    }
  }

  const groupId = await chrome.tabs.group({ tabIds: tabs.map((t) => t.tab.id!) });
  const group = await chrome.tabGroups.get(groupId);

  await chrome.tabGroups.update(group.id, {
    color: 'blue',
    title: `MultiPost-${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
  });

  return tabs;
}

export async function injectScriptsToTabs(
  tabs: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }[],
  data: SyncData,
) {
  for (const t of tabs) {
    const tab = t.tab;
    const platform = t.platformInfo;
    if (tab.id) {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          getPlatformInfo(platform.name).then((info) => {
            if (info) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: info.injectFunction,
                args: [data],
              });
            }
          });
        }
      });
    }
  }
}
// Inject || 注入 || END
