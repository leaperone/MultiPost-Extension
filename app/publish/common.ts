import { sendRequest } from '@/extension/common';
import { type PlatformInfo } from '@/types/platform';
import { type SyncData } from '@/types/sync';

export const funcPublish = async (data: SyncData) => {
  sendRequest('MUTLIPOST_EXTENSION_PUBLISH', data);
};

export const funcGetPlatformInfos = async (): Promise<PlatformInfo[]> => {
  return sendRequest('MUTLIPOST_EXTENSION_PLATFORMS');
};

interface PlatformResponse {
  platforms: PlatformInfo[];
}

export const getPlatformInfos = async (type: string) => {
  const response = await funcGetPlatformInfos();
  const platforms = Array.isArray(response) ? response : (response as PlatformResponse).platforms;
  return platforms.filter((platform: PlatformInfo) => platform.type === type);
};
