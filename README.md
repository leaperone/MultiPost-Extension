<div align="center">

# MultiPost

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website 网站](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

[English](README.md) | [中文](docs/README-zh.md) | [日本語](docs/README-jp.md) | [Français](docs/README-fr.md) | [한국어](docs/README-kr.md)

> A browser extension that helps users publish content to multiple social media platforms with one click.

</div>


---

## How to start
- [multipost.app](https://multipost.app) - Official website
- [MultiPost Article Editor](https://md.multipost.app/) - [(Repo)](https://github.com/leaper-one/multipost-wechat-markdown-editor) - Online editor for creating and publishing content to multiple platforms.
- [Chrome extension - ![Chrome Web Store Version Chrome网上商店版本](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome网上商店用户](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Edge extension - ![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)
<!-- ![Edge add-on last updated](https://img.shields.io/badge/dynamic/json?label=last%20updated&query=%24.lastUpdateDate&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg) -->

## Key Features

- Support synchronous posting to over 10 mainstream platforms including Zhihu, Weibo, Xiaohongshu, TikTok, etc.
- No login, no registration, no API Key required. Free!
- Support multiple content types including text, images, and videos
- Support web page integration, allowing you to develop your own web pages and set up automation using the extension's publishing features, such as:
  - Automatically capture web content and publish to multiple platforms
  - Schedule posts
  - AI content generation integration

This extension solves the pain points of content creators when publishing across multiple platforms. Through a single edit, content can be synchronized to all platforms, greatly improving work efficiency.

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

[![Star History Chart](https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension&type=Date)](https://star-history.com/#leaper-one/MultiPost-Extension&Date)

## Contact Us

- QQ Group: [921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- Email: support@leaper.one
- GitHub Issues: https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![QQ Group](docs/MultiPost-Extension_2025-02-28T14_17_15.717Z.png)
