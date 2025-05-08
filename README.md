<div align="center">

# MultiPost

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website 网站](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)



[English](README.md) | [中文](docs/README-zh.md) | [日本語](docs/README-jp.md) | [Français](docs/README-fr.md) | [한국어](docs/README-kr.md)

> A browser extension that helps users publish content to multiple social media platforms with one click.
> 一个用于在多个社交平台上发布内容的浏览器扩展。

⭐ If you find this project helpful, please consider giving it a star! Your support helps us grow and improve! ⭐
</div>



## 主要功能 / Key Features
- 一键发布内容（文本、图片、视频等）到多个平台。（支持知乎、微博、小红书、抖音等10多个主流平台）无需登录、无需注册、无需API Key。完全免费！
  Post your content (text, images, videos, etc.) to multiple platforms with one click. (Over 10 mainstream platforms including Zhihu, Weibo, Xiaohongshu, TikTok, etc.) No login, no registration, no API Key required. Free!
- 两种API接口 / 2 types of API Interface:
  - 扩展API：在您自己的Web应用中调用扩展的API发布内容。
    Extension API: Calling the extension's API to publish content in your own web app.
  - RESTful API：在脚本或服务器中调用RESTful API发布内容。
    RESTful API: Calling the RESTful API to publish content in your script or server.
- 数据分析：追踪您的内容在不同平台的表现。可以监控您的网站和社交媒体账号。
  Analytics: Track the performance of your content on different platforms. Your websites and social media accounts can be monitored.
- 内容抓取 / Scraper:
  - 阅读器：读取网页内容，返回Markdown或Json格式。
    Reader: Read the content of the web page, return Markdown or Json.
  - 搜索引擎结果：获取搜索引擎的搜索结果。
    SERP: Get the search results from search engines.
  - 社交媒体：获取社交媒体平台的内容。
    Social Media: Get the content from social media platforms.

该扩展解决了内容创作者在多平台发布时的痛点。通过一次编辑，内容可以同步到所有平台，大大提高工作效率。
This extension solves the pain points of content creators when publishing across multiple platforms. Through a single edit, content can be synchronized to all platforms, greatly improving work efficiency.

## How to start
- [multipost.app](https://multipost.app) - Official website
- [Documentation | 文档](https://docs.multipost.app)
- [MultiPost Article Editor](https://md.multipost.app/) - [(Repo)](https://github.com/leaperone/multipost-wechat-markdown-editor) - Online editor for creating and publishing content to multiple platforms.
- [Chrome extension - ![Chrome Web Store Version Chrome网上商店版本](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome网上商店用户](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Edge extension - ![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)
<!-- ![Edge add-on last updated](https://img.shields.io/badge/dynamic/json?label=last%20updated&query=%24.lastUpdateDate&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg) -->


## Getting Started

First, run the development server:

```bash
pnpm i

pnpm dev
```

In the browser extension page, open the developer mode, click `Load **unpacked** extension` and find `build/chrome-mv3-dev` to load it.

## Building the Production Version

Run the following command:

```bash
pnpm build
```

You can find the build content in the `build` folder

## Development Instructions

### Documents You Need to Know

[Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)

[Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

[Plasmo Docs](https://docs.plasmo.com/)

## Recommended Articles

- [AI Full Stack Guide Vol.033: Learn One-Click Multi-Platform Content Publishing in 5 Minutes](https://mp.weixin.qq.com/s/K7yh6EsBLOGJzl8Gh8SwLw)

### File Structure

> src/sync: This folder contains the code for operating on different platforms, where dynamic is related to dynamic publishing, and video is related to video publishing; any added platform needs to be registered in common.ts.
> components: This folder contains all the components for frontend interface operations.

### Development Environment

It is recommended to use the package management tool `pnpm@latest-9` with Node.js version 20.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=leaperone/multipost-wechat-markdown-editor,leaperone/MultiPost-Extension&type=Date)](https://www.star-history.com/#leaperone/multipost-wechat-markdown-editor&leaperone/MultiPost-Extension&Date)

## Contact Us

- QQ Group: [921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- Email: support@leaper.one
- Twitter: [@harry_wong_](https://x.com/harry_is_fish)
- Bento: [Click me](https://bento.me/harryisfish)
- GitHub Issues: https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![QQ Group](docs/MultiPost-Extension_2025-02-28T14_17_15.717Z.png)
