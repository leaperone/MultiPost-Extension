import type { AccountInfo } from '~sync/common';

export async function getXAccountInfo(): Promise<AccountInfo> {
  // 直接使用fetch API获取 X 页面HTML
  const response = await fetch('https://x.com/home', {
    method: 'GET',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'text/html',
    },
    credentials: 'include', // 包含cookie以确保认证
  });

  if (!response.ok) {
    throw new Error(`HTTP错误，状态码: ${response.status}`);
  }

  const htmlText = await response.text();

  // 解析window.__INITIAL_STATE__
  const initialStateMatch = htmlText.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})(?:\s*;|\s*<\/script>)/s);

  if (!initialStateMatch || !initialStateMatch[1]) {
    throw new Error('无法找到 __INITIAL_STATE__ 数据');
  }

  const jsonStr = initialStateMatch[1];

  // 尝试解析JSON
  let initialState;
  try {
    initialState = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('解析 X __INITIAL_STATE__ 数据失败:', parseError);
    // 清理可能的JSON问题
    const cleanedJsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
      .replace(/:undefined,/g, ':null,') // 处理undefined
      .replace(/:undefined}/g, ':null}'); // 处理末尾的undefined

    try {
      initialState = JSON.parse(cleanedJsonStr);
    } catch {
      throw new Error('解析 __INITIAL_STATE__ 数据失败');
    }
  }

  // 从entities.users.entities中获取用户信息，这里的键是动态的用户ID
  const usersEntities = initialState.entities?.users?.entities;
  if (!usersEntities || Object.keys(usersEntities).length === 0) {
    throw new Error('无法找到用户信息');
  }

  // 获取第一个用户ID（假设只有当前登录用户）
  const userId = Object.keys(usersEntities)[0];
  const userInfo = usersEntities[userId];

  if (!userInfo) {
    throw new Error('无法解析用户数据');
  }

  const result: AccountInfo = {
    provider: 'x',
    accountId: userInfo.screen_name,
    username: userInfo.name,
    description: userInfo.description,
    profileUrl: `https://x.com/${userInfo.screen_name}`,
    avatarUrl: userInfo.profile_image_url_https,
    extraData: initialState,
  };

  return result;
}
