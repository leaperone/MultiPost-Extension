'use client';

import { useMemo } from 'react';
import { useIsDesktop, getDesktopBridge, createAndShowPublishGroup } from '@/lib/desktop-bridge';
import type {
  ContentType,
  DynamicData,
  VideoData,
  ArticleData,
  PublishData,
  FileSelectOptions,
} from '@/lib/desktop-bridge';
import { funcPublish, getPlatformInfos } from '@/lib/extension';
import type { PlatformInfo as ExtPlatformInfo, SyncData, FileData } from '@/lib/extension';

// Unified file type for cross-strategy use
export interface SelectedFile {
  name: string;
  url: string;
  type: string;
  size: number;
  file?: File; // Web only
  path?: string; // Desktop only (local file path)
  previewUrl?: string; // Desktop only (data URL for preview)
}

export interface PublishStrategy {
  isDesktop: boolean;

  /** Select files via native dialog (Desktop) or trigger file input (Web) */
  selectFiles(options?: FileSelectOptions): Promise<SelectedFile[]>;

  /** Get available platforms for a content type */
  getPlatforms(contentType: ContentType): Promise<ExtPlatformInfo[]>;

  /** Publish dynamic content */
  publishDynamic(params: {
    title?: string;
    content: string;
    images: (FileData | SelectedFile)[];
    videos: (FileData | SelectedFile)[];
    platforms: ExtPlatformInfo[];
    selectedPlatformNames: string[];
    isAutoPublish: boolean;
  }): Promise<{ success: boolean; error?: string }>;

  /** Publish video content */
  publishVideo(params: {
    title: string;
    content: string;
    video: FileData | SelectedFile | string;
    cover?: FileData | SelectedFile | string;
    tags?: string[];
    platforms: ExtPlatformInfo[];
    selectedPlatformNames: string[];
    scheduledPublishTime?: number;
  }): Promise<{ success: boolean; error?: string }>;

  /** Publish article content (Desktop only) */
  publishArticle(params: {
    title: string;
    digest: string;
    cover: string;
    htmlContent: string;
    markdownContent: string;
    selectedAccountIds: string[];
  }): Promise<{ success: boolean; error?: string }>;
}

function createWebStrategy(): PublishStrategy {
  return {
    isDesktop: false,

    async selectFiles(): Promise<SelectedFile[]> {
      // Web strategy: caller should use HTML file input directly
      // This is a no-op; the component handles file input via refs
      return [];
    },

    async getPlatforms(contentType: ContentType): Promise<ExtPlatformInfo[]> {
      return getPlatformInfos(contentType);
    },

    async publishDynamic({ content, title, images, videos, platforms, selectedPlatformNames, isAutoPublish }) {
      const data: SyncData = {
        platforms: platforms.filter((p) => selectedPlatformNames.includes(p.name)),
        data: {
          title,
          content,
          images: images as FileData[],
          videos: videos as FileData[],
        },
        isAutoPublish,
      };
      return funcPublish(data);
    },

    async publishVideo({ title, content, video, cover, tags, platforms, selectedPlatformNames, scheduledPublishTime }) {
      const data: SyncData = {
        platforms: platforms.filter((p) => selectedPlatformNames.includes(p.name)),
        data: {
          title,
          content,
          video: video as FileData,
          cover: cover || undefined,
          tags,
          scheduledPublishTime,
        },
        isAutoPublish: false,
      };
      return funcPublish(data);
    },

    async publishArticle() {
      return { success: false, error: 'Article publish is only available in Desktop mode' };
    },
  };
}

function createDesktopStrategy(): PublishStrategy {
  return {
    isDesktop: true,

    async selectFiles(options?: FileSelectOptions): Promise<SelectedFile[]> {
      const bridge = getDesktopBridge();
      if (!bridge) return [];

      const files = await bridge.app.selectFile(options);
      const result: SelectedFile[] = await Promise.all(
        files.map(async (filePath) => {
          try {
            const dataUrl = await bridge.app.readFileAsDataURL(filePath);
            return {
              name: filePath.split('/').pop() || filePath,
              url: dataUrl,
              type: 'image/*',
              size: 0,
              path: filePath,
              previewUrl: dataUrl,
            };
          } catch {
            return {
              name: filePath.split('/').pop() || filePath,
              url: `file://${filePath}`,
              type: 'image/*',
              size: 0,
              path: filePath,
              previewUrl: `file://${filePath}`,
            };
          }
        }),
      );
      return result;
    },

    async getPlatforms(): Promise<ExtPlatformInfo[]> {
      // Desktop doesn't use Extension platforms; it uses bridge.app.getPlatforms()
      // Return empty - Desktop pages use useDesktopPlatforms() hook directly
      return [];
    },

    async publishDynamic(params) {
      const bridge = getDesktopBridge();
      if (!bridge) return { success: false, error: 'Desktop bridge not available' };

      // Desktop uses selectedAccountIds and accounts passed via extended params
      const { content, images } = params;
      const extra = params as any;
      const selectedAccountIds: string[] = extra.selectedAccountIds || [];
      const accounts: any[] = extra.accounts || [];

      const data: DynamicData = {
        content: content.trim(),
        images: images.map((img: any) => img.path || img.url),
      };

      const targets = selectedAccountIds.map((accountId: string) => {
        const account = accounts.find((a: any) => a.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account?.displayName || account?.username || '',
        };
      });

      const groupId = await createAndShowPublishGroup({
        contentType: 'DYNAMIC',
        targets,
        data,
      });

      return groupId ? { success: true } : { success: false, error: 'Failed to create publish group' };
    },

    async publishVideo(params) {
      const bridge = getDesktopBridge();
      if (!bridge) return { success: false, error: 'Desktop bridge not available' };

      // Desktop uses selectedAccountIds and accounts passed via extended params
      const { title, content, video, cover, tags } = params;
      const extra = params as any;
      const selectedAccountIds: string[] = extra.selectedAccountIds || [];
      const accounts: any[] = extra.accounts || [];

      const data: VideoData = {
        title: title.trim(),
        content: content.trim(),
        video: typeof video === 'string' ? video : (video as SelectedFile).path || (video as SelectedFile).url,
        tags,
        cover: cover ? (typeof cover === 'string' ? cover : (cover as SelectedFile).path) : undefined,
      };

      const targets = selectedAccountIds.map((accountId: string) => {
        const account = accounts.find((a: any) => a.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account?.displayName || account?.username,
        };
      });

      await bridge.publish.startInExecutor({
        contentType: 'VIDEO',
        targets,
        data,
        autoSubmit: false,
      });

      return { success: true };
    },

    async publishArticle({ title, digest, cover, htmlContent, markdownContent, selectedAccountIds }) {
      const bridge = getDesktopBridge();
      if (!bridge) return { success: false, error: 'Desktop bridge not available' };

      const data: ArticleData = {
        title: title.trim(),
        digest: digest.trim(),
        cover,
        htmlContent,
        markdownContent: markdownContent.trim(),
      };

      const accounts = await bridge.account.list();
      const targets = selectedAccountIds.map((accountId) => {
        const account = accounts.find((a) => a.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account?.displayName || account?.username,
        };
      });

      await bridge.publish.startInExecutor({
        contentType: 'ARTICLE',
        targets,
        data,
        autoSubmit: false,
      });

      return { success: true };
    },
  };
}

/**
 * Hook to get the appropriate publish strategy based on environment.
 * Returns Web strategy (Extension API) or Desktop strategy (Bridge API).
 */
export function usePublishStrategy(): PublishStrategy {
  const isDesktop = useIsDesktop();

  const strategy = useMemo(
    () => (isDesktop ? createDesktopStrategy() : createWebStrategy()),
    [isDesktop],
  );

  return strategy;
}
