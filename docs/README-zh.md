<div align="center">

# MultiPost

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website 网站](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

[MultiPost 文档](https://docs.multipost.app)

[English](../README.md) | [中文](README-zh.md) | [日本語](README-jp.md) | [Français](README-fr.md) | [한국어](README-kr.md)

> 一键发布内容到多个社交平台的浏览器扩展。

⭐ 如果这个项目对你有帮助，欢迎给我们一个 star！你的支持是我们前进的动力！⭐

</div>

---

<!-- 最新更新 -->
<div align="center">
  <h3>MultiPost Analytics: Web Trace</h3>
  <p>Web Trace: 实时访问统计、访客分析、浏览分析和时长分析。</p>
  <p>实时访问统计、访客分析、浏览分析和时长分析。</p>
  <p>了解更多：<a href="https://multipost.app/dashboard/analytics">https://multipost.app/dashboard/analytics</a></p>
</div>

---

## 快速开始
- [multipost.app](https://multipost.app) - 官方网站
- [MultiPost 文档](https://docs.multipost.app)
- [MultiPost 文章编辑器](https://md.multipost.app/) - [(代码仓库)](https://github.com/leaper-one/multipost-wechat-markdown-editor) - 用于创建和发布内容到多个平台的在线编辑器
- [Chrome 扩展 - ![Chrome Web Store Version Chrome网上商店版本](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome网上商店用户](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Edge 扩展 - ![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

## 主要功能

- 支持同步发布到知乎、微博、小红书、抖音等十多个主流平台
- 免登录，免注册，免API Key。免费！
- 支持发布文字、图片、视频等多种内容形式
- 支持网页的联动，可以开发你自己的网页并自己设置自动化，调用扩展的发布功能, 如：
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

## 推荐文章

- [AI全栈指南 Vol.033：5分钟学会内容一键发布多平台](https://mp.weixin.qq.com/s/K7yh6EsBLOGJzl8Gh8SwLw)

### 文件架构

> src/sync：该文件夹下存放了有关操作不同平台的代码，其中 dynamic 是动态发布相关的，video 是视频发布相关的；任何加入的平台都需要在 common.ts 中注册。
> components：该文件下存放了所有前端界面操作的组件。

### 开发环境

包管理工具建议使用 `pnpm@latest-9`，Node.js版本20。

## Star History
<a href="https://www.star-history.com/#leaper-one/MultiPost-Extension&leaper-one/multipost-wechat-markdown-editor&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date" />
 </picture>
</a>

## 联系我们

- QQ群：[921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- 邮箱：support@leaper.one
- GitHub Issues：https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![QQ 群](MultiPost-Extension_2025-02-28T14_17_15.717Z.png)
