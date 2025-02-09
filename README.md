# MultiPost

> A browser extension that helps users publish content to multiple social media platforms with one click.

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website 网站](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

## Installation

- [![Chrome Web Store Version Chrome网上商店版本](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome网上商店用户](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih)

- [![Edge Extension](https://img.shields.io/badge/Edge%20Extension-v0.0.4-0884D8)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

---

[English](README.md) | [中文](docs/README-zh.md)

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

In the browser extension page, open the developer mode, click `Load unpacked extension` and find `build/chrome-mv3-dev` to load it.

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

### File Structure

> src/sync: This folder contains the code for operating on different platforms, where dynamic is related to dynamic publishing, and video is related to video publishing; any added platform needs to be registered in common.ts.
> components: This folder contains all the components for frontend interface operations.

### Development Environment

It is recommended to use the package management tool `pnpm@latest-9`.
