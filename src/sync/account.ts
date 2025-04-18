import { getPlatformInfos, type AccountInfo, type PlatformInfo } from './common';
import { getXAccountInfo } from './account/x';
import { getTiktokAccountInfo } from './account/tiktok';
import { getDouyinAccountInfo } from './account/douyin';
import { getRednoteAccountInfo } from './account/rednote';
import { getBilibiliAccountInfo } from './account/bilibili';
import { Storage } from '@plasmohq/storage';
import { ping } from '~background/services/api';

// 存储账号信息的键名
export const ACCOUNT_INFO_STORAGE_KEY = 'multipost_account_info';

// 初始化 storage 实例
const storage = new Storage({
  area: 'local',
});

/**
 * 获取指定平台账号的最新信息
 * @param accountKey 账号标识符
 * @returns 返回账号信息
 */
export async function refreshAccountInfo(accountKey: string): Promise<AccountInfo> {
  const platformInfos = await getPlatformInfos();
  const platformInfo = platformInfos.find((p) => p.accountKey === accountKey);
  if (!platformInfo) {
    throw new Error(`找不到账号信息: ${accountKey}`);
  }

  let accountInfo: AccountInfo;

  // 根据平台类型获取账号信息
  if (accountKey === 'x') {
    accountInfo = await getXAccountInfo();
  } else if (accountKey === 'tiktok') {
    accountInfo = await getTiktokAccountInfo();
  } else if (accountKey === 'douyin') {
    accountInfo = await getDouyinAccountInfo();
  } else if (accountKey === 'rednote') {
    accountInfo = await getRednoteAccountInfo();
  } else if (accountKey === 'bilibili') {
    accountInfo = await getBilibiliAccountInfo();
  } else {
    return null;
  }

  if (!accountInfo) {
    console.error(`获取账号信息失败: ${accountKey}`);
    removeAccountInfo(accountKey);
    return null;
  }

  // 更新平台信息并保存到storage
  await saveAccountInfo(accountKey, accountInfo);

  return accountInfo;
}

/**
 * 保存账号信息到storage
 * @param accountKey 账号标识符
 * @param accountInfo 账号信息
 */
async function saveAccountInfo(accountKey: string, accountInfo: AccountInfo): Promise<void> {
  // 获取当前存储的所有账号信息
  const accountInfoMap: Record<string, AccountInfo> = (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};

  // 更新指定平台的账号信息
  accountInfoMap[accountKey] = accountInfo;

  // 保存回storage
  await storage.set(ACCOUNT_INFO_STORAGE_KEY, accountInfoMap);
}

/**
 * 获取指定平台的账号信息，优先从storage获取
 * @param accountKey 账号标识符
 * @param forceRefresh 是否强制刷新
 * @returns 账号信息
 */
export async function getAccountInfo(accountKey: string, forceRefresh = false): Promise<AccountInfo> {
  if (forceRefresh) {
    return refreshAccountInfo(accountKey);
  }

  // 从storage中获取
  const accountInfoMap: Record<string, AccountInfo> = (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};

  if (accountInfoMap[accountKey]) {
    return accountInfoMap[accountKey];
  }

  // storage中没有，刷新获取
  return refreshAccountInfo(accountKey);
}

/**
 * 获取所有已保存的账号信息
 * @returns 账号信息映射表
 */
export async function getAllAccountInfo(): Promise<Record<string, AccountInfo>> {
  return (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};
}

/**
 * 从storage中移除指定账号信息
 * @param accountKey 账号标识符
 */
export async function removeAccountInfo(accountKey: string): Promise<void> {
  const accountInfoMap: Record<string, AccountInfo> = (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};

  if (accountInfoMap[accountKey]) {
    delete accountInfoMap[accountKey];
    await storage.set(ACCOUNT_INFO_STORAGE_KEY, accountInfoMap);
  }
}

/**
 * 刷新所有平台的账号信息
 * @returns 所有账号信息的映射表
 */
export async function refreshAllAccountInfo(): Promise<Record<string, AccountInfo>> {
  // 获取所有平台信息
  const platformInfos = await getPlatformInfos();
  const results: Record<string, AccountInfo> = {};
  const errors: Record<string, Error> = {};

  // 并行刷新所有账号信息
  await Promise.allSettled(
    platformInfos.map(async (platformInfo) => {
      try {
        if (platformInfo.accountKey) {
          const accountInfo = await refreshAccountInfo(platformInfo.accountKey);
          results[platformInfo.accountKey] = accountInfo;
        }
      } catch (error) {
        console.error(`刷新账号信息失败: ${platformInfo.accountKey}`, error);
        errors[platformInfo.accountKey] = error as Error;
      }
    }),
  );

  // 如果所有请求都失败了，抛出错误
  if (Object.keys(results).length === 0 && Object.keys(errors).length > 0) {
    throw new Error('所有账号信息刷新失败');
  }

  await ping(true);

  return results;
}

export async function getAccountInfoFromPlatformInfos(platformInfos: PlatformInfo[]): Promise<PlatformInfo[]> {
  const accountInfoMap: Record<string, AccountInfo> = (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};

  for (const platformInfo of platformInfos) {
    if (platformInfo.accountKey && accountInfoMap[platformInfo.accountKey]) {
      platformInfo.accountInfo = accountInfoMap[platformInfo.accountKey];
    }
  }

  return platformInfos;
}

export async function getAccountInfoFromPlatformInfo(platformInfo: PlatformInfo): Promise<PlatformInfo> {
  const accountInfoMap: Record<string, AccountInfo> = (await storage.get(ACCOUNT_INFO_STORAGE_KEY)) || {};
  if (platformInfo.accountKey && accountInfoMap[platformInfo.accountKey]) {
    platformInfo.accountInfo = accountInfoMap[platformInfo.accountKey];
  }
  return platformInfo;
}
