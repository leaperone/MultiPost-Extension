// Pure data-shape types shared by every injector script.
//
// Lifted verbatim from the extension's src/sync/common.ts. Only the interfaces
// migrate here; the value parts of common.ts (infoMap, getPlatformInfo,
// chrome.* tab orchestration) stay in the extension and are NOT part of the
// desktop/web injection path — injector scripts only ever `import type` these.

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
  tags?: string[];
  scheduledPublishTime?: number;
}

export interface PodcastData {
  title: string;
  description: string;
  audio: FileData;
  cover?: FileData;
  tags?: string[];
  category?: string | number;
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
  tags?: string[];
  category?: string | number; // 平台分类 ID 或名称
  original?: boolean; // 原创声明
  allowComment?: boolean;
  scheduledPublishTime?: number;
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
  tags?: string[];
  cover?: FileData;
  verticalCover?: FileData;
  horizontalCover?: FileData;
  videoFile?: File; // 原始 File 对象，用于避免 blob URL 问题
  scheduledPublishTime?: number;
  category?: string | number; // 平台分区 ID（如 B 站 tid，YouTube category）
  original?: boolean; // 原创声明
  collectionId?: string | number; // 合集/系列 ID（如 B 站 list_id）
  description?: string; // 描述（独立于 content/简介）
}

export interface PlatformInfo {
  type: "DYNAMIC" | "VIDEO" | "ARTICLE" | "PODCAST";
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
