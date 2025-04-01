# 如果想要开始开发

## 开始使用

首先，运行开发服务器：

```bash
pnpm i

pnpm dev
```

在浏览器扩展程序页面中打开开发者模式，点击 `加载已解压的扩展程序` 并找到 `build/chrome-mv3-dev` 进行加载。

## 构建生产版本

运行以下命令：

```bash
pnpm build
```

你可以在 `build` 文件夹下找到构建内容

## 开发说明

### 你需要了解的文档

[Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)

[Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

[Plasmo Docs](https://docs.plasmo.com/)

## 推荐文章

- [AI全栈指南 Vol.033：5分钟学会内容一键发布多平台](https://mp.weixin.qq.com/s/K7yh6EsBLOGJzl8Gh8SwLw)

### 文件架构

> src/sync：该文件夹下存放了有关操作不同平台的代码，其中 dynamic 是动态发布相关的，video 是视频发布相关的；任何加入的平台都需要在 common.ts 中注册。
> components：该文件下存放了所有前端界面操作的组件。

### 开发文档

- [抖音动态发布功能开发记录](development/douyin-dynamic.md)
- [抖音账号信息获取](development/douyin-account.md)
- [B站动态发布功能开发记录](development/bilibili-dynamic.md)

## 功能开发指南

### 动态发布功能

动态发布是我们扩展的核心功能之一。目前所有平台都采用页面操作的方式实现，主要包含以下几个关键部分：

#### 1. 基础架构

每个平台的动态发布功能都需要实现以下接口：

```typescript
export async function DynamicPlatform(data: SyncData) {
  // 实现平台特定的发布逻辑
}
```

#### 2. 核心实现模式

所有平台遵循类似的实现模式：

1. 注册平台信息到 infos

每个平台需要注册到 `infos` 中，然后通过 `infos` 中的信息来进行初始化。

例如 Bilibili 动态发布的平台信息如下：

```typescript
// src/sync/dynamic.ts
  DYNAMIC_BILIBILI: {
    type: 'DYNAMIC', // 平台类型
    name: 'DYNAMIC_BILIBILI', // 平台名称，一般以 DYNAMIC_、ARTICEL_ 或 VIDEO_ 开头
    homeUrl: 'https://t.bilibili.com', // 平台首页，建议设置为平台的登录页面
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico', // 平台图标，在 F12 中的网页可以找到不同平台的 favicon 资源的来源
    iconifyIcon: 'ant-design:bilibili-outlined', // 平台图标（可选）
    platformName: chrome.i18n.getMessage('platformBilibili'), // 平台名称，在 locales 中进行 i18n 配置
    injectUrl: 'https://t.bilibili.com', // 平台发布页面，注入脚本时打开的页面
    injectFunction: DynamicBilibili, // 平台发布函数
    tags: ['CN'], // 平台标签，例如 ['CN'] 表示中文平台，['EN'] 表示英文平台
    accountKey: 'bilibili', // 平台账号标识，用于获取账号信息的 key
  },
```

其中 accountKey 是获取账号信息的 key，用于获取账号信息，详情可以查看 `src/sync/account.ts` 和 `src/sync/account` 文件夹。

2. 内容处理

2.1 标题

获取到输入框或其它输入区域，然后进行内容填充。可以考虑直接使用 `textContent` 或 `innerHTML` 进行填充，或者使用复制粘贴事件等方式进行。

```typescript
const titleElement = await waitForElement('h1[class*="title"]');
const title = titleElement.textContent;
```

2.2 内容

获取到输入框或其它输入区域，然后进行内容填充。可以考虑直接使用 `textContent` 或 `innerHTML` 进行填充，或者使用复制粘贴事件等方式进行。

```typescript
const contentElement = await waitForElement('div[class*="content"]');
const content = contentElement.textContent;
```

2.3 上传图片/视频等

找到文件输入Input后，使用 fetch 下载图片/视频等，然后使用 DataTransfer 模拟文件上传。

```typescript
const response = await fetch(imageUrl);
const blob = await response.blob();
const imageFile = new File([blob], file.name, { type: file.type });

const dataTransfer = new DataTransfer();
dataTransfer.items.add(imageFile);
const imageData = dataTransfer.files[0];

fileInput.files = dataTransfer.files;
fileInput.dispatchEvent(new Event('change', { bubbles: true }));
```

3. 自动发布（可选）

```typescript
if (autoPublish) {
  const publishButton = await waitForElement('button[type="submit"]');
  publishButton.click();
} else {
  // 监听手动发布
  publishButton.addEventListener('click', () => {
    setTimeout(() => window.location.reload(), 3000);
  });
}
```

#### 3. 开发建议

1. 错误处理

   - 使用 try-catch 包裹主要逻辑
   - 实现超时机制
   - 添加状态检查
   - 完善日志记录

2. 代码健壮性

   - 处理异常情况
   - 实现重试机制
   - 添加状态验证
   - 优化性能表现

3. 调试技巧
   - 添加详细的日志输出
   - 使用 Chrome DevTools 调试
   - 模拟各种异常情况

#### 4. 注意事项

1. 页面结构依赖

   - 需要注意平台页面结构更新
   - 使用可靠的选择器
   - 实现优雅的降级处理

2. 异步操作

   - 合理设置等待时间
   - 处理并发操作
   - 避免资源竞争

3. 用户体验
   - 提供清晰的状态反馈
   - 处理各种边界情况
   - 支持手动和自动模式
