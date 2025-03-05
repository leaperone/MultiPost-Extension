import { sendRequest } from '@/extension/common';
import { type PlatformInfo } from '@/types/platform';
import { type SyncData } from '@/types/sync';

export const funcPublish = async (data: SyncData) => {
  sendRequest('MUTLIPOST_EXTENSION_PUBLISH', data);
};

export const funcGetPlatformInfos = async (): Promise<PlatformInfo[]> => {
  return sendRequest('MUTLIPOST_EXTENSION_PLATFORMS');
};

interface PermissionResponse {
  status: string;
  trusted: boolean;
}

export const funcGetPermission = async (timeout: number = 30000) => {
  return sendRequest<PermissionResponse>('MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN', undefined, timeout);
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
