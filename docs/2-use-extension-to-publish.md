# 使用扩展程序发布内容
> 为了让我们的扩展更加强大，我们对外提供了相关接口，允许网页调用我们的扩展程序。
你可以在自己的网页中集成 MultiPost 扩展，允许用户一键发布内容到多个平台上。


## 实现方式

我们通过 `window.postMessage` 来实现网页和扩展程序之间的通信。扩展首先会在每个网页中都注入 `src/contents/extension.ts` 中的脚本，然后通过 `window.postMessage` 来发送消息和接收消息并将消息发送给 `src/background/index.ts` 中的脚本进行处理。

## 快速开始

### 1. 安装依赖
请参考 [1-how-to-start-devlopment.md](1-how-to-start-devlopment.md) 中的安装依赖部分。

### 2. 基础通信工具函数
我们以 Next.js 为例，首先，创建一个基础的通信工具文件 `extension-common.ts`：

```typescript
import { v4 as uuidv4 } from 'uuid';

// 请求类型定义
export type ExtensionExternalRequest<T> = {
  type: 'request';
  traceId: string;
  action: string;
  data: T;
};

// 响应类型定义
export interface ExtensionExternalResponse<T> {
  type: 'response';
  traceId: string;
  action: string;
  code: number;
  message: string;
  data: T;
};

// 通用请求发送函数
export async function sendRequest<T>(action: string, data?: T, timeout: number = 5000): Promise<T> {
  const traceId = uuidv4();

  return new Promise<T>((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'response' && event.data.action === action && event.data.traceId === traceId) {
        cleanup();
        resolve(event.data.data);
      }
    };

    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    }

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    window.addEventListener('message', messageHandler);

    window.postMessage(
      {
        type: 'request',
        traceId,
        action,
        data,
      },
      '*',
    );
  });
}
```

### 3. 扩展功能封装

创建一个扩展功能封装文件 `extension-api.ts`：

```typescript
import { sendRequest } from './extension-common';
import type { PlatformInfo } from './types';
import type { SyncData } from './types';

// 检查扩展服务状态
export async function checkServiceStatus(timeout: number = 5000): Promise<boolean> {
  try {
    await sendRequest<void>('MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Service check failed:', error);
    return false;
  }
}

// 打开扩展选项页
export async function openOptions(timeout: number = 5000): Promise<boolean> {
  try {
    await sendRequest<void>('MUTLIPOST_EXTENSION_OPEN_OPTIONS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Failed to open extension options:', error);
    return false;
  }
}

// 发布内容
export const publishContent = async (data: SyncData) => {
  return sendRequest('MUTLIPOST_EXTENSION_PUBLISH', data);
};

// 获取平台信息
export const getPlatformInfos = async (): Promise<PlatformInfo[]> => {
  const response = await sendRequest<{ platforms: PlatformInfo[] }>('MUTLIPOST_EXTENSION_PLATFORMS');
  return Array.isArray(response) ? response : (response?.platforms ?? []);
};

// 获取域名权限
export const requestPermission = async (timeout: number = 30000) => {
  return sendRequest<{ status: string; trusted: boolean }>('MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN', undefined, timeout);
};

// 按类型获取平台信息
export const getPlatformsByType = async (type: string) => {
  const platforms = await getPlatformInfos();
  return platforms.filter(platform => platform.type === type);
};
```

## 使用示例

### 1. 检查扩展是否可用

```typescript
async function checkExtension() {
  try {
    const isAvailable = await checkServiceStatus();
    if (!isAvailable) {
      console.error('MultiPost 扩展未安装或未启用');
      return false;
    }
    
    const permission = await requestPermission();
    if (!permission.trusted) {
      console.error('网站未获得扩展授权');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('检查扩展状态失败:', error);
    return false;
  }
}
```

### 2. 获取可用平台列表

```typescript
async function loadPlatforms() {
  try {
    // 获取所有平台
    const allPlatforms = await getPlatformInfos();
    console.log('所有可用平台:', allPlatforms);
    
    // 获取特定类型的平台
    const dynamicPlatforms = await getPlatformsByType('DYNAMIC');
    const videoPlatforms = await getPlatformsByType('VIDEO');
    
    console.log('动态内容平台:', dynamicPlatforms);
    console.log('视频平台:', videoPlatforms);
  } catch (error) {
    console.error('获取平台列表失败:', error);
  }
}
```

### 3. 发布内容

```typescript
async function publishPost() {
  try {
    const content = {
      platforms: ['zhihu', 'weibo'], // 目标平台
      auto_publish: true, // 是否自动发布
      data: {
        title: '测试文章',
        content: '这是一篇测试文章的内容...',
        images: ['https://example.com/image.jpg'],
        // 其他平台特定的数据...
      }
    };
    
    await publishContent(content);
    console.log('内容发布成功');
  } catch (error) {
    console.error('发布失败:', error);
  }
}
```

### 4. 完整的集成示例

```typescript
import { checkServiceStatus, requestPermission, getPlatformInfos, publishContent } from './extension-api';

class MultiPostIntegration {
  private initialized = false;
  
  async init() {
    try {
      // 检查扩展状态
      const isAvailable = await checkServiceStatus();
      if (!isAvailable) {
        throw new Error('MultiPost 扩展未安装或未启用');
      }
      
      // 请求权限
      const permission = await requestPermission();
      if (!permission.trusted) {
        throw new Error('网站未获得扩展授权');
      }
      
      // 获取平台列表
      const platforms = await getPlatformInfos();
      if (!platforms.length) {
        throw new Error('没有可用的发布平台');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('初始化失败:', error);
      return false;
    }
  }
  
  async publish(content: any) {
    if (!this.initialized) {
      throw new Error('请先初始化 MultiPost 集成');
    }
    
    try {
      await publishContent(content);
      return true;
    } catch (error) {
      console.error('发布失败:', error);
      return false;
    }
  }
}

// 使用示例
const multipost = new MultiPostIntegration();

async function start() {
  if (await multipost.init()) {
    const content = {
      platforms: ['zhihu', 'weibo'],
      auto_publish: true,
      data: {
        title: '测试文章',
        content: '文章内容...'
      }
    };
    
    await multipost.publish(content);
  }
}
```

## 错误处理

在使用扩展程序接口时，可能会遇到以下错误情况：

1. 扩展未安装或未启用（code: 404）
2. 域名未授权（code: 403）
3. 请求超时（code: 408）
4. 发布失败（code: 500）

建议实现适当的错误处理机制：

```typescript
function handleError(error: any) {
  switch (error.code) {
    case 403:
      console.error('请先在扩展中授权当前网站');
      // 提示用户去扩展中授权
      openOptions();
      break;
    case 404:
      console.error('请先安装 MultiPost 扩展');
      // 引导用户安装扩展
      window.open('https://chrome.google.com/webstore/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih');
      break;
    case 408:
      console.error('请求超时，请检查网络连接');
      break;
    default:
      console.error('发生错误:', error);
  }
}
```

## 开发建议

1. **初始化检查**
   - 在页面加载时检查扩展是否可用
   - 确保获得必要的权限
   - 预先加载平台列表

2. **错误处理**
   - 实现完善的错误处理机制
   - 为用户提供清晰的错误提示
   - 引导用户解决问题

## 类型定义参考

```typescript
// 平台信息类型
interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  platformName: string;
  username?: string;
  userAvatarUrl?: string;
  injectUrl: string;
}

// 发布数据类型
interface SyncData {
  platforms: string[];
  auto_publish: boolean;
  data: {
    title?: string;
    content: string;
    images?: string[];
    video?: string;
    [key: string]: any;
  };
}
```

## 接口

### 通用接口请求、响应

具体内容参考 `src/types/external.ts` 中的 `ExternalRequest` 和 `ExternalResponse` 类型。

```typescript
export type ExtensionExternalRequest<T> = {
  type: 'request';
  traceId: string;
  action: string;
  data: T;
};
```

一个基本的请求示例：

```typescript
window.postMessage(
  {
    type: 'request',
    traceId: '123', // traceId 用于标识一次请求，由调用方生成
    action: 'getToken',
    data: { name: 'test' },
  },
  '*',
);
```

### 未授权响应

如果网页调用扩展程序的接口时，扩展程序用户未授权过该网页的域名，则会返回未授权的响应。

```typescript
{
  type: 'response',
  traceId: request.traceId,
  action: request.action,
  code: 403,
  message: 'Untrusted origin',
  data: null,
}
```

### 确定扩展当前状态

```js
window.postMessage({
  type: 'request',
  traceId: '',
  action: 'MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS',
  data: {},
});
```

响应体：

```typescript
interface CheckServiceStatusResponse {
  extensionId: string; // 扩展程序的 ID
}
```

### 打开扩展设置页

```js
window.postMessage({
  type: 'request',
  traceId: '',
  action: 'MUTLIPOST_EXTENSION_OPEN_OPTIONS',
  data: {},
});
```

### 获取扩展访问权限

由于我们扩展的特殊性，我们允许网页调用我们的扩展程序，但是需要网页先获取扩展的访问权限。

```js
window.postMessage({
  type: 'request',
  traceId: '',
  action: 'MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN',
  data: {},
});
```

响应体：

```typescript
interface TrustDomainResponse {
  trusted: boolean; // 是否信任
  status: 'confirm' | 'cancel'; // 确认或取消
}
```

### 获取当前可用于发布的平台

```js
window.postMessage({
  type: 'request',
  traceId: '',
  action: 'MUTLIPOST_EXTENSION_PLATFORMS',
  data: {},
});
```

响应体：

```typescript
interface PlatformResponse {
  platforms: PlatformInfo[]; // 当前可用于发布的平台
}

interface PlatformInfo {
  type: 'DYNAMIC' | 'VIDEO';
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  platformName: string;
  username?: string;
  userAvatarUrl?: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
}
```

### 发布内容

有关 `SyncData` 的和其他的类型定义，请参考 `src/sync/common.ts` 中的 `SyncData` 类型。

```js
interface SyncData {
  platforms: string[];
  auto_publish: boolean;
  data: DynamicData | PostData | VideoData;
}

window.postMessage({
  type: 'request',
  traceId: '',
  action: 'MUTLIPOST_EXTENSION_PUBLISH',
  data: {
    platforms: ['DYNAMIC', 'VIDEO'],
    auto_publish: true,
    data: {
      title: 'test',
    },
  },
});
```

## 參考

```typescript
import { v4 as uuidv4 } from 'uuid';

export type ExtensionExternalRequest<T> = {
  type: 'request';
  traceId: string;
  action: string;
  data: T;
};

export interface ExtensionExternalResponse<T> {
  type: 'response';
  traceId: string;
  action: string;
  code: number;
  message: string;
  data: T;
}

export async function sendRequest<T>(action: string, data?: T, timeout: number = 5000): Promise<T> {
  const traceId = uuidv4();

  return new Promise<T>((resolve, reject) => {
    // Create message handler
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'response' && event.data.action === action && event.data.traceId === traceId) {
        cleanup();
        resolve(event.data.data);
      }
    };

    // Create timeout handler
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    }

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Add event listener
    window.addEventListener('message', messageHandler);

    // Send the message
    window.postMessage(
      {
        type: 'request',
        traceId,
        action,
        data,
      },
      '*',
    );
  });
}

export async function checkServiceStatus(timeout: number = 5000): Promise<boolean> {
  try {
    // Send request and wait for actual response
    await sendRequest<void>('MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Service check failed:', error);
    return false;
  }
}
```