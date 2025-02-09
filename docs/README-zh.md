# MultiPost

> 一键发布内容到多个社交平台的浏览器扩展

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website 网站](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

## 安装

- [![Chrome Web Store Version Chrome网上商店版本](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome网上商店用户](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih)

- [![Edge Extension](https://img.shields.io/badge/Edge%20Extension-v0.0.4-0884D8)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

---

[English](../README.md) | [中文](docs/README-zh.md)

## 主要功能

- 支持同步发布到知乎、微博、小红书、抖音等十多个主流平台
- 免登录，免注册，免API Key。免费！
- 支持发布文字、图片、视频等多种内容形式
- 支持网页的联动，可以开发你自己的网页并自己设置自动化，调用扩展的发布功能, 如
  - 自动抓取网页内容，自动发布到多个平台
  - 定时发布
  - 联动 AI 生成内容

这个扩展主要解决了内容创作者在多平台发布时的痛点。通过一次编辑，就能将内容同步发布到所有平台，大大提高了工作效率。

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

### 文件架构

> src/sync：该文件夹下存放了有关操作不同平台的代码，其中 dynamic 是动态发布相关的，video 是视频发布相关的；任何加入的平台都需要在 common.ts 中注册。
> components：该文件下存放了所有前端界面操作的组件。

### 开发环境

包管理工具建议使用 `pnpm@latest-9`
