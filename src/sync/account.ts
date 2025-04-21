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

export const refreshAccountInfoMap: Record<
  string,
  {
    platformName: string;
    accountKey: string;
    homeUrl: string;
    faviconUrl: string;
    getAccountInfo: () => Promise<AccountInfo>;
  }
> = {
  x: {
    platformName: chrome.i18n.getMessage('platformX'),
    accountKey: 'x',
    homeUrl: 'https://x.com',
    faviconUrl: 'https://x.com/favicon.ico',
    getAccountInfo: getXAccountInfo,
  },
  tiktok: {
    platformName: chrome.i18n.getMessage('platformTiktok'),
    accountKey: 'tiktok',
    homeUrl: 'https://www.tiktok.com',
    faviconUrl: 'https://pic1.zhimg.com/80/v2-9ad49e8e52b473e4c366b69bc9653a45_1440w.png',
    getAccountInfo: getTiktokAccountInfo,
  },
  douyin: {
    platformName: chrome.i18n.getMessage('platformDouyin'),
    accountKey: 'douyin',
    homeUrl: 'https://creator.douyin.com',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    getAccountInfo: getDouyinAccountInfo,
  },
  rednote: {
    platformName: chrome.i18n.getMessage('platformRednote'),
    accountKey: 'rednote',
    homeUrl: 'https://creator.xiaohongshu.com',
    faviconUrl: 'https://fe-video-qc.xhscdn.com/fe-platform/ed8fe781ce9e16c1bfac2cd962f0721edabe2e49.ico',
    getAccountInfo: getRednoteAccountInfo,
  },
  bilibili: {
    platformName: chrome.i18n.getMessage('platformBilibili'),
    accountKey: 'bilibili',
    homeUrl: 'https://t.bilibili.com',
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico',
    getAccountInfo: getBilibiliAccountInfo,
  },
};

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

  const accountInfo = await refreshAccountInfoMap[accountKey].getAccountInfo();

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

export interface RefreshResult {
  accounts: Record<string, AccountInfo>;
  errors: Record<string, string>;
}

/**
 * 刷新所有平台的账号信息
 * @returns 所有账号信息的映射表和错误信息
 */
export async function refreshAllAccountInfo(): Promise<RefreshResult> {
  const results: Record<string, AccountInfo> = {};
  const errors: Record<string, string> = {};

  // 并行刷新所有账号信息
  await Promise.allSettled(
    Object.entries(refreshAccountInfoMap).map(async ([accountKey]) => {
      try {
        if (accountKey) {
          const accountInfo = await refreshAccountInfo(accountKey);
          if (accountInfo) {
            results[accountKey] = accountInfo;
          } else {
            errors[accountKey] = chrome.i18n.getMessage('refreshAccountsNotLoggedIn');
          }
        }
      } catch (error) {
        console.error(`刷新账号信息失败: ${accountKey}`, error);
        errors[accountKey] = (error as Error).message || chrome.i18n.getMessage('refreshAccountsError');
      }
    }),
  );

  await ping(true);

  return {
    accounts: results,
    errors,
  };
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
