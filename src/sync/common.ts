import { ArticleInfoMap } from './article';
import { DynamicInfoMap } from './dynamic';
import { VideoInfoMap } from './video';

export interface SyncData {
  platforms: string[];
  auto_publish: boolean;
  data: DynamicData | ArticleData | VideoData;
}

export interface DynamicData {
  title: string;
  content: string;
  images: FileData[];
  videos: FileData[];
}

export interface FileData {
  name: string;
  url: string;
  type: string;
  size: number;
  base64?: string;
  originUrl?: string;
}

export interface ArticleData {
  title: string;
  content: string;
  digest: string;
  cover: FileData;
  images: FileData[];
  videos: FileData[];
  fileDatas: FileData[];
  originContent?: string;
  markdownContent?: string;
  markdownOriginContent?: string;
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
}

export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO' | 'ARTICLE';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  iconifyIcon?: string;
  platformName: string;
  username?: string;
  userAvatarUrl?: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
  tags?: string[];
  accountInfo?: AccountInfo;
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
};

export function getDefaultPlatformInfo(platform: string): PlatformInfo | null {
  return infoMap[platform] || null;
}

export function getPlatformInfos(type?: 'DYNAMIC' | 'VIDEO' | 'ARTICLE'): PlatformInfo[] {
  if (!type) return Object.values(infoMap);
  return Object.values(infoMap).filter((info) => info.type === type);
}

// Inject || 注入 || START
export async function createTabsForPlatforms(data: SyncData) {
  const tabs = [];
  for (const platform of data.platforms) {
    const info = getDefaultPlatformInfo(platform);
    if (info) {
      const tab = await chrome.tabs.create({ url: info.injectUrl });
      tabs.push([tab, platform]);
    }
  }

  const groupId = await chrome.tabs.group({ tabIds: tabs.map((t) => t[0].id!) });
  const group = await chrome.tabGroups.get(groupId);

  await chrome.tabGroups.update(group.id, {
    color: 'blue',
    title: `MultiPost-${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
  });

  return tabs;
}

export async function injectScriptsToTabs(tabs: [chrome.tabs.Tab, string][], data: SyncData) {
  for (const t of tabs) {
    const tab = t[0];
    const platform = t[1];
    if (tab.id) {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          const info = getDefaultPlatformInfo(platform);
          if (info) {
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
// Inject || 注入 || END
