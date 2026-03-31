/**
 * @file Browser extension communication utilities
 * @description Provides utilities for communicating with the MultiPost browser extension
 * through window message events
 */

import { PublishPostData, SchedulePublishPostData } from '@/app/api/extension/types';
import { v4 as uuidv4 } from 'uuid';

export interface SyncData {
  platforms: PlatformInfo[];
  isAutoPublish: boolean;
  data: DynamicData | ArticleData | VideoData | PodcastData;
}

export interface DynamicData {
  title: string;
  content: string;
  images: FileData[];
  videos: FileData[];
}

export interface FileData {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
  originUrl?: string;
  file?: File;
}

export interface ArticleData {
  title: string;
  digest: string;
  cover: FileData;
  htmlContent: string;
  markdownContent: string;
  images?: FileData[];
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
  cover?: FileData;
  tags: string[];
  scheduledPublishTime?: number;
}

export interface PodcastData {
  title: string;
  description: string;
  audio: FileData;
}

export interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST';
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
  accountKey: string;
  accountInfo?: AccountInfo;
   
  extraConfig?: any;
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

/**
 * 扩展消息响应的基础接口
 */
export interface ExtensionResponse<T> {
  type: 'response';
  action: string;
  traceId: string;
  data: T;
}

/**
 * Sends a request to the browser extension and waits for a response
 * @description Uses window.postMessage for communication with the extension,
 * with timeout and cleanup handling
 * @param {string} action - The action identifier for the extension to process
 * @param {D} data - Optional data to send with the request
 * @param {number} timeout - Timeout in milliseconds before the request fails
 * @returns {Promise<R>} Promise that resolves with the extension's response
 * @throws {Error} When the request times out
 * @example
 * const response = await sendRequest<void, boolean>('SOME_ACTION', undefined, 5000);
 */
export async function sendRequest<D, R>(action: string, data?: D, timeout: number = 10000): Promise<R> {
  const traceId = uuidv4();

  return new Promise<R>((resolve, reject) => {
    // Create message handler
    const messageHandler = (event: MessageEvent<ExtensionResponse<R>>) => {
      if (event.data.type === 'response' && event.data.action === action && event.data.traceId === traceId) {
        cleanup();
        resolve(event.data.data);
      }
    };

    // Create timeout handler
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    }

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Add event listener
    window.addEventListener('message', messageHandler);

    // Send the message
    window.postMessage(
      {
        type: 'request',
        traceId,
        action,
        data,
      },
      '*',
    );
  });
}

/**
 * Checks if the MultiPost extension service is running and accessible
 * @description Sends a status check request to the extension
 * @param {number} timeout - Timeout in milliseconds before the check fails
 * @returns {Promise<boolean>} True if the service is running, false otherwise
 * @example
 * const isServiceRunning = await checkServiceStatus(5000);
 */
export async function checkServiceStatus(timeout: number = 5000): Promise<boolean> {
  try {
    // Send request and wait for actual response
    await sendRequest<void, void>('MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Service check failed:', error);
    return false;
  }
}

/**
 * Opens the extension options page
 * @description Sends a request to the extension to open its options page
 * @param {number} timeout - Timeout in milliseconds before the request fails
 * @returns {Promise<boolean>} True if successful, false if failed
 * @example
 * const opened = await openOptions(5000);
 */
export async function openOptions(timeout: number = 5000): Promise<boolean> {
  try {
    await sendRequest<void, void>('MUTLIPOST_EXTENSION_OPEN_OPTIONS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Failed to open extension options:', error);
    return false;
  }
}

export interface PublishResult {
  success: boolean;
  error?: string;
}

export const funcPublish = async (
  data: SyncData | PublishPostData | SchedulePublishPostData,
  timeout: number = 30000,
): Promise<PublishResult> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('funcPublish', data);
  }
  try {
    await sendRequest<SyncData | PublishPostData | SchedulePublishPostData, void>(
      'MUTLIPOST_EXTENSION_PUBLISH',
      data,
      timeout,
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('funcPublish failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const funcGetPlatformInfos = async (): Promise<PlatformInfo[]> => {
  return sendRequest<void, PlatformInfo[]>('MUTLIPOST_EXTENSION_PLATFORMS');
};

interface PermissionResponse {
  status: string;
  trusted: boolean;
}

export const funcGetPermission = async (timeout: number = 30000) => {
  return sendRequest<void, PermissionResponse>('MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN', undefined, timeout);
};

interface PlatformResponse {
  platforms: PlatformInfo[];
}

export const getPlatformInfos = async (type: string) => {
  const response = await funcGetPlatformInfos();
  if (!response) return [];
  const platforms = Array.isArray(response) ? response : ((response as PlatformResponse)?.platforms ?? []);
  return platforms.filter((platform: PlatformInfo) => platform.type === type);
};

export const linkExtensionClient = async (apiKey: string, timeout: number = 30000) => {
  return sendRequest<{ apiKey: string }, { confirm: boolean }>(
    'MUTLIPOST_EXTENSION_LINK_EXTENSION',
    { apiKey },
    timeout,
  );
};
