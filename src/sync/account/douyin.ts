import type { AccountInfo } from '~sync/common';

export async function getDouyinAccountInfo(): Promise<AccountInfo> {
  // 访问TikTok API获取用户信息
  const response = await fetch('https://creator.douyin.com/web/api/media/user/info/', {
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
    provider: 'douyin',
    accountId: responseData.user.sec_uid,
    username: responseData.user.nickname,
    description: responseData.user.signature,
    profileUrl: `https://www.douyin.com/user/${responseData.user.sec_uid}`,
    avatarUrl: responseData.user.avatar_larger.url_list[0],
    extraData: responseData,
  };

  return result;
}
