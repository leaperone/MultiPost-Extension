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

### 开发环境

包管理工具建议使用 `pnpm@latest-9`，Node.js版本20