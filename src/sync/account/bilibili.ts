import type { AccountInfo } from '~sync/common';

export async function getBilibiliAccountInfo(): Promise<AccountInfo> {
  // 访问Bilibili API获取用户信息
  const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
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

  if (!responseData.data.code) {
    return null
  }

  const result: AccountInfo = {
    provider: 'bilibili',
    accountId: responseData.data.mid,
    username: responseData.data.uname,
    description: '',
    profileUrl: `https://space.bilibili.com/${responseData.data.mid}`,
    avatarUrl: responseData.data.face,
    extraData: responseData,
  };

  return result;
}
