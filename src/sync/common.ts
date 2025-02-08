import { DynamicBilibili } from './dynamic/bilibili';
import { DynamicDouyin } from './dynamic/douyin';
import { DynamicInstagram } from './dynamic/instagram';
import { DynamicRednote } from './dynamic/rednote';
import { DynamicWeibo } from './dynamic/weibo';
import { DynamicX } from './dynamic/x';
import { DynamicXueqiu } from './dynamic/xueqiu';
import { VideoYoutube } from './video/youtube';
import { DynamicZhihu } from './dynamic/zhihu';
import { VideoBilibili } from './video/bilibili';
import { VideoRednote } from './video/rednote';
import { VideoDouyin } from './video/douyin';
import { DynamicFacebook } from './dynamic/facebook';
import { VideoTiktok } from './video/tiktok';
import { DynamicLinkedin } from './dynamic/linkedin';
import { DynamicOkjike } from './dynamic/okjike';

export interface SyncData {
  platforms: string[];
  auto_publish: boolean;
  data: DynamicData | PostData | VideoData;
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
}

export interface PostData {
  title: string;
  content: string;
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
}

export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  iconifyIcon?: string;
  platformName: string;
  username?: string;
  userAvatarUrl?: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
}

export const infoMap: Record<string, PlatformInfo> = {
  DYNAMIC_X: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_X',
    homeUrl: 'https://x.com/home',
    faviconUrl: 'https://x.com/favicon.ico',
    iconifyIcon: 'simple-icons:x',
    platformName: chrome.i18n.getMessage('platformX'),
    injectUrl: 'https://x.com/home',
    injectFunction: DynamicX,
  },
  DYNAMIC_BILIBILI: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BILIBILI',
    homeUrl: 'https://t.bilibili.com',
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico',
    iconifyIcon: 'ant-design:bilibili-outlined',
    platformName: chrome.i18n.getMessage('platformBilibili'),
    injectUrl: 'https://t.bilibili.com',
    injectFunction: DynamicBilibili,
  },
  DYNAMIC_REDNOTE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_REDNOTE',
    homeUrl: 'https://creator.xiaohongshu.com/',
    faviconUrl: 'https://fe-video-qc.xhscdn.com/fe-platform/ed8fe781ce9e16c1bfac2cd962f0721edabe2e49.ico',
    iconifyIcon: 'simple-icons:xiaohongshu',
    platformName: chrome.i18n.getMessage('platformRednote'),
    injectUrl: 'https://creator.xiaohongshu.com/publish/publish',
    injectFunction: DynamicRednote,
  },
  DYNAMIC_WEIBO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIBO',
    homeUrl: 'https://weibo.com',
    faviconUrl: 'https://weibo.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformWeibo'),
    injectUrl: 'https://weibo.com',
    injectFunction: DynamicWeibo,
  },
  DYNAMIC_XUEQIU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_XUEQIU',
    homeUrl: 'https://xueqiu.com',
    faviconUrl: 'https://xueqiu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformXueqiu'),
    injectUrl: 'https://xueqiu.com',
    injectFunction: DynamicXueqiu,
  },
  DYNAMIC_ZHIHU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_ZHIHU',
    homeUrl: 'https://www.zhihu.com',
    faviconUrl: 'https://www.zhihu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformZhihu'),
    injectUrl: 'https://www.zhihu.com',
    injectFunction: DynamicZhihu,
  },
  DYNAMIC_DOUYIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DOUYIN',
    homeUrl: 'https://creator.douyin.com/',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouyin'),
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    injectFunction: DynamicDouyin,
  },
  DYNAMIC_INSTAGRAM: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_INSTAGRAM',
    homeUrl: 'https://www.instagram.com/',
    faviconUrl: 'https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png',
    iconifyIcon: 'simple-icons:instagram',
    platformName: chrome.i18n.getMessage('platformInstagram'),
    injectUrl: 'https://www.instagram.com/',
    injectFunction: DynamicInstagram,
  },
  DYNAMIC_FACEBOOK: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_FACEBOOK',
    homeUrl: 'https://www.facebook.com/',
    faviconUrl: 'https://static.xx.fbcdn.net/rsrc.php/yT/r/aGT3gskzWBf.ico',
    iconifyIcon: 'simple-icons:facebook',
    platformName: chrome.i18n.getMessage('platformFacebook'),
    injectUrl: 'https://www.facebook.com/',
    injectFunction: DynamicFacebook,
  },
  DYNAMIC_LINKEDIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_LINKEDIN',
    homeUrl: 'https://www.linkedin.com/',
    faviconUrl: 'https://static.licdn.com/aero-v1/sc/h/eahiplrwoq61f4uan012ia17i',
    iconifyIcon: 'simple-icons:linkedin',
    platformName: chrome.i18n.getMessage('platformLinkedin'),
    injectUrl: 'https://www.linkedin.com/feed',
    injectFunction: DynamicLinkedin,
  },
  DYNAMIC_OKJIKE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_OKJIKE',
    homeUrl: 'https://web.okjike.com',
    faviconUrl: 'https://web.okjike.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformOkjike'),
    injectUrl: 'https://web.okjike.com',
    injectFunction: DynamicOkjike,
  },
  VIDEO_BILIBILI: {
    type: 'VIDEO',
    name: 'VIDEO_BILIBILI',
    homeUrl: 'https://member.bilibili.com/',
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico',
    iconifyIcon: 'simple-icons:bilibili',
    platformName: chrome.i18n.getMessage('platformBilibili'),
    injectUrl: 'https://member.bilibili.com/platform/upload/video/frame',
    injectFunction: VideoBilibili,
  },
  VIDEO_DOUYIN: {
    type: 'VIDEO',
    name: 'VIDEO_DOUYIN',
    homeUrl: 'https://creator.douyin.com/',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouyin'),
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    injectFunction: VideoDouyin,
  },
  VIDEO_YOUTUBE: {
    type: 'VIDEO',
    name: 'VIDEO_YOUTUBE',
    homeUrl: 'https://studio.youtube.com/',
    faviconUrl: 'https://www.youtube.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformYoutube'),
    injectUrl: 'https://studio.youtube.com/',
    injectFunction: VideoYoutube,
  },
  VIDEO_REDNOTE: {
    type: 'VIDEO',
    name: 'VIDEO_REDNOTE',
    homeUrl: 'https://creator.xiaohongshu.com',
    faviconUrl: 'https://creator.xiaohongshu.com/favicon.ico',
    iconifyIcon: 'simple-icons:xiaohongshu',
    platformName: chrome.i18n.getMessage('platformRednote'),
    injectUrl: 'https://creator.xiaohongshu.com/publish/publish',
    injectFunction: VideoRednote,
  },
  VIDEO_TIKTOK: {
    type: 'VIDEO',
    name: 'VIDEO_TIKTOK',
    homeUrl: 'https://www.tiktok.com/tiktokstudio',
    faviconUrl: 'https://pic1.zhimg.com/80/v2-9ad49e8e52b473e4c366b69bc9653a45_1440w.png',
    platformName: chrome.i18n.getMessage('platformTiktok'),
    injectUrl: 'https://www.tiktok.com/tiktokstudio/upload',
    injectFunction: VideoTiktok,
  },
};

export function getDefaultPlatformInfo(platform: string): PlatformInfo | null {
  return infoMap[platform] || null;
}

export function getPlatformInfos(type?: 'DYNAMIC' | 'VIDEO'): PlatformInfo[] {
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
