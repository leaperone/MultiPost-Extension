// Shared types between Web, Desktop, and Extension

export type PlatformType =
  // 已实现的平台
  | 'weibo'
  | 'xiaohongshu'
  | 'twitter'
  | 'douyin'
  | 'bilibili'
  // zhihu: disabled due to anti-crawling issues
  // | 'zhihu'
  | 'wechat'
  // 中国动态平台
  | 'xueqiu'
  | 'okjike'
  | 'kuaishou'
  | 'baijiahao'
  | 'toutiao'
  | 'toutiaohao'
  | 'weixinchannel'
  | 'v2ex'
  | 'douban'
  | 'dedao'
  | 'zsxq'
  | 'xiaoheihe'
  | 'maimai'
  | 'juejin'
  // 国际动态平台
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'threads'
  | 'bluesky'
  | 'substack'
  | 'webhook'
  // 视频平台
  | 'youtube'
  | 'tiktok'
  | 'eastmoney'
  | 'qie'
  | 'chejiahao'
  | 'dewu'
  | 'yiche'
  | 'sohu'
  | 'netease'
  | 'dayu'
  | 'alipay'
  | 'yidian'
  | 'pinduoduo'
  | 'vivovideo'
  // 文章平台
  | 'csdn'
  | 'jianshu'
  | 'segmentfault'
  | 'sspai'
  | '51cto'
  | 'wordpress'

export interface PlatformInfo {
  id: PlatformType
  name: string
  icon: string
  iconifyIcon?: string
  faviconUrl?: string
  url: string
  loginUrl: string
  supportedContentTypes: SyncContentType[]
}

export type SyncContentType = 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST'

export interface FileData {
  name: string
  path?: string
  url: string
  type?: string
  size?: number
}

export interface DynamicData {
  title: string
  content: string
  images: FileData[]
  videos: FileData[]
}

export interface VideoData {
  title: string
  content: string
  video: FileData
  tags?: string[]
  cover?: FileData
  verticalCover?: FileData
  scheduledPublishTime?: number
}

export interface ArticleData {
  title: string
  digest: string
  cover: FileData
  htmlContent: string
  markdownContent: string
  images?: FileData[]
}

export interface PodcastData {
  title: string
  description: string
  audio: FileData
}

export type SyncContentData = DynamicData | VideoData | ArticleData | PodcastData

export interface SyncData {
  platforms: SyncDataPlatform[]
  contentType: SyncContentType
  isAutoPublish: boolean
  data: SyncContentData
}

export interface SyncDataPlatform {
  name: string
  injectUrl?: string
  extraConfig?: unknown
}
