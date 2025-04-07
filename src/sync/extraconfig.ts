import { ping } from '~background/services/api';
import { type PlatformInfo } from './common';
import { Storage } from '@plasmohq/storage';

// 存储额外配置信息的键名
export const EXTRA_CONFIG_STORAGE_KEY = 'multipost_extra_config';

// 初始化 storage 实例
const storage = new Storage({
  area: 'local',
});

/**
 * 保存平台额外配置到storage
 * @param platformKey 平台标识符
 * @param extraConfig 额外配置信息
 */
export async function saveExtraConfig<T>(platformKey: string, extraConfig: T): Promise<void> {
  // 获取当前存储的所有额外配置信息
  const extraConfigMap: Record<string, unknown> = (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};

  // 更新指定平台的额外配置信息
  extraConfigMap[platformKey] = extraConfig;

  // 保存回storage
  await storage.set(EXTRA_CONFIG_STORAGE_KEY, extraConfigMap);

  await ping(true);
}

/**
 * 获取指定平台的额外配置信息
 * @param platformKey 平台标识符
 * @returns 额外配置信息
 */
export async function getExtraConfig<T>(platformKey: string): Promise<T | null> {
  // 从storage中获取
  const extraConfigMap: Record<string, unknown> = (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};

  return (extraConfigMap[platformKey] as T) || null;
}

/**
 * 获取所有已保存的额外配置信息
 * @returns 额外配置信息映射表
 */
export async function getAllExtraConfig(): Promise<Record<string, unknown>> {
  return (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};
}

/**
 * 从storage中移除指定平台的额外配置信息
 * @param platformKey 平台标识符
 */
export async function removeExtraConfig(platformKey: string): Promise<void> {
  const extraConfigMap: Record<string, unknown> = (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};

  if (extraConfigMap[platformKey]) {
    delete extraConfigMap[platformKey];
    await storage.set(EXTRA_CONFIG_STORAGE_KEY, extraConfigMap);
  }
}

export async function getExtraConfigFromPlatformInfos(platformInfos: PlatformInfo[]): Promise<PlatformInfo[]> {
  const extraConfigMap: Record<string, unknown> = (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};

  // 为每个平台填充额外配置信息
  for (const platformInfo of platformInfos) {
    if (extraConfigMap[platformInfo.name]) {
      platformInfo.extraConfig = extraConfigMap[platformInfo.name];
    }
  }

  return platformInfos;
}

export async function getExtraConfigFromPlatformInfo(platformInfo: PlatformInfo): Promise<PlatformInfo> {
  const extraConfigMap: Record<string, unknown> = (await storage.get(EXTRA_CONFIG_STORAGE_KEY)) || {};
  if (platformInfo.name && extraConfigMap[platformInfo.name]) {
    platformInfo.extraConfig = extraConfigMap[platformInfo.name];
  }
  return platformInfo;
}
