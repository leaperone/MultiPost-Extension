import { ArticleWeibo } from '@ext/sync/article/weibo'
import { ArticleZhihu } from '@ext/sync/article/zhihu'
import { DynamicDouyin } from '@ext/sync/dynamic/douyin'
import { DynamicWeibo } from '@ext/sync/dynamic/weibo'
import { DynamicZhihu } from '@ext/sync/dynamic/zhihu'
import { VideoBilibili } from '@ext/sync/video/bilibili'
import { VideoDouyin } from '@ext/sync/video/douyin'
import { VideoWeibo } from '@ext/sync/video/weibo'
import { VideoZhihu } from '@ext/sync/video/zhihu'
import type { PlatformType, SyncContentData, SyncContentType } from '@shared/types'

export interface ExtensionSyncDataPlatform {
  name: string
  injectUrl?: string
  extraConfig?: unknown
}

export interface ExtensionSyncData {
  platforms: ExtensionSyncDataPlatform[]
  isAutoPublish: boolean
  data: SyncContentData
  origin?: SyncContentData
}

export interface ExtensionInjectFunction {
  (data: ExtensionSyncData): Promise<void>
}

export interface DesktopInjectorManifestEntry {
  desktopPlatform: PlatformType
  contentType: SyncContentType
  extensionKey: string
  injectFn: ExtensionInjectFunction
  injectUrl: string
  accountKey: string
}

export const desktopInjectorManifest: DesktopInjectorManifestEntry[] = [
  {
    desktopPlatform: 'weibo',
    contentType: 'DYNAMIC',
    extensionKey: 'DYNAMIC_WEIBO',
    injectFn: DynamicWeibo,
    injectUrl: 'https://weibo.com',
    accountKey: 'weibo'
  },
  {
    desktopPlatform: 'weibo',
    contentType: 'VIDEO',
    extensionKey: 'VIDEO_WEIBO',
    injectFn: VideoWeibo,
    injectUrl: 'https://weibo.com/upload/channel',
    accountKey: 'weibo'
  },
  {
    desktopPlatform: 'weibo',
    contentType: 'ARTICLE',
    extensionKey: 'ARTICLE_WEIBO',
    injectFn: ArticleWeibo,
    injectUrl: 'https://card.weibo.com/article/v3/editor',
    accountKey: 'weibo'
  },
  // DYNAMIC_BILIBILI removed: image upload depends on the extension MAIN-world postMessage helper.
  {
    desktopPlatform: 'bilibili',
    contentType: 'VIDEO',
    extensionKey: 'VIDEO_BILIBILI',
    injectFn: VideoBilibili,
    injectUrl: 'https://member.bilibili.com/platform/upload/video/frame',
    accountKey: 'bilibili'
  },
  // ARTICLE_BILIBILI removed: starts async main() without await/return, so desktop resolves early.
  {
    desktopPlatform: 'zhihu',
    contentType: 'DYNAMIC',
    extensionKey: 'DYNAMIC_ZHIHU',
    injectFn: DynamicZhihu,
    injectUrl: 'https://www.zhihu.com',
    accountKey: 'zhihu'
  },
  {
    desktopPlatform: 'zhihu',
    contentType: 'VIDEO',
    extensionKey: 'VIDEO_ZHIHU',
    injectFn: VideoZhihu,
    injectUrl: 'https://www.zhihu.com/zvideo/upload-video',
    accountKey: 'zhihu'
  },
  {
    desktopPlatform: 'zhihu',
    contentType: 'ARTICLE',
    extensionKey: 'ARTICLE_ZHIHU',
    injectFn: ArticleZhihu,
    injectUrl: 'https://zhuanlan.zhihu.com/write',
    accountKey: 'zhihu'
  },
  {
    desktopPlatform: 'douyin',
    contentType: 'DYNAMIC',
    extensionKey: 'DYNAMIC_DOUYIN',
    injectFn: DynamicDouyin,
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    accountKey: 'douyin'
  },
  {
    desktopPlatform: 'douyin',
    contentType: 'VIDEO',
    extensionKey: 'VIDEO_DOUYIN',
    injectFn: VideoDouyin,
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    accountKey: 'douyin'
  }
]

export function getDesktopInjectorManifestEntry(
  desktopPlatform: PlatformType,
  contentType: SyncContentType
): DesktopInjectorManifestEntry | undefined {
  return desktopInjectorManifest.find(
    (entry) => entry.desktopPlatform === desktopPlatform && entry.contentType === contentType
  )
}
