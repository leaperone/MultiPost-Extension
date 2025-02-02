# MultiPost - 一键发布内容到多个社交平台的浏览器扩展

> 官网：[multipost.app](https://multipost.app)
> Repo：[leaper-one/MultiPost-Extension](https://github.com/leaper-one/MultiPost-Extension)

这是一个浏览器扩展，可以帮助用户一键将内容同步发布到多个社交媒体平台。

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

## 浏览器扩展商店

- [Chrome 网上应用店](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Microsoft Edge 外接程序](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

## 开始使用

首先，运行开发服务器：

```bash
pnpm i

pnpm dev
# 或者
npm run dev
```

## 构建生产版本

运行以下命令：

```bash
pnpm build
# 或者
npm run build
```
