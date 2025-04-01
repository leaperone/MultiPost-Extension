# 抖音账号信息获取开发记录

## AccountInfo 实现

我们首先定义了 `AccountInfo` 类型，用于存储账号信息。

```ts
export interface AccountInfo {
  provider: string;
  accountId: string;
  username: string;
  description?: string;
  profileUrl?: string;
  avatarUrl?: string;
  extraData: unknown;
}
```

并将其附加到了 `Platform` 类型中。

而后使用 `src/sync/account.ts` 文件中的方法来获取账号信息。

## 抖音账号信息获取

为了实现在前端展示给用户当前已登录的账号信息，我们需要获取抖音账号信息。

具体的实现在 `src/sync/account/douyin.ts` 文件中。

```ts
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
```

通过在抖音后台 F12，我们找到了这个用于获取用户信息的接口，使用 fetch 请求获取到用户信息后，我们就可以在前端展示给用户当前已登录的账号信息。

然后我们将这个函数挂载到 `src/sync/account.ts` 文件中的 `getAccountInfo` 方法中。

其中 `provider` 和 `PlatformInfo` 中的 `accountKey` 对应，平台信息在返回的时候会在存储中查找对应的账号信息。

# 大功告成

通过上述步骤，我们就可以获取到抖音账号信息，并展示给用户。
