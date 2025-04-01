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

- [B站动态发布功能开发记录](development/bilibili-dynamic.md)

### 开发环境

包管理工具建议使用 `pnpm@latest-9`，Node.js版本20

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

1. 等待页面元素
```typescript
function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`找不到元素 "${selector}"`));
    }, timeout);
  });
}
```

2. 内容处理
```typescript
const editor = await waitForElement('div[contenteditable="true"]');
editor.textContent = content;
editor.dispatchEvent(new Event('input', { bubbles: true }));
```

3. 图片上传
```typescript
// 下载并转换图片
const response = await fetch(imageUrl);
const blob = await response.blob();
const imageFile = new File([blob], file.name, { type: file.type });

// 通过 postMessage 触发上传
window.postMessage({ 
  type: 'PLATFORM_DYNAMIC_UPLOAD_IMAGES', 
  files: [imageFile] 
}, '*');
```

4. 发布控制
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