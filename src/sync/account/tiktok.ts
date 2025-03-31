import type { AccountInfo } from '~sync/common';

export async function getTiktokAccountInfo(): Promise<AccountInfo> {
  // 访问抖音创作者API获取用户信息
  const response = await fetch('https://www.tiktok.com/node-webapp/api/common-app-context', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 包含cookie以确保认证
  });

  if (!response.ok) {
    throw new Error(`HTTP错误，状态码: ${response.status}`);
  }

  const responseData = await response.json();

  if (!responseData.user) {
    return null;
  }

  const result: AccountInfo = {
    provider: 'tiktok',
    accountId: responseData.user.secUid,
    username: responseData.user.uniqueId,
    description: responseData.user.signature,
    profileUrl: `https://www.tiktok.com/${responseData.user.uniqueId}`,
    avatarUrl: responseData.user.avatarUri[0],
    extraData: responseData,
  };

  return result;
}
