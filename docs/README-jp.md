# MultiPost

> ワンクリックで複数のSNSプラットフォームに投稿できるブラウザ拡張機能

![GitHub License](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

[English](../README.md) | [中文](README-zh.md) | [日本語](README-jp.md) | [Français](README-fr.md) | [한국어](README-kr.md)

---

## インストール

- [![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

## 主な機能

- 知乎、Weibo、小紅書、TikTokなど10以上の主要プラットフォームへの同時投稿をサポート
- ログイン不要、登録不要、APIキー不要。無料！
- テキスト、画像、動画など様々なコンテンツ形式に対応
- Webページとの連携をサポートし、独自のWebページを開発して拡張機能の投稿機能を自動化できます：
  - Webページのコンテンツを自動取得し、複数のプラットフォームに自動投稿
  - 投稿のスケジュール設定
  - AIコンテンツ生成との連携

この拡張機能は、コンテンツクリエイターがマルチプラットフォームで投稿する際の課題を解決します。1回の編集で、すべてのプラットフォームにコンテンツを同期投稿でき、作業効率を大幅に向上させます。

## 使い方

まず、開発サーバーを起動します：

```bash
pnpm i

pnpm dev
```

ブラウザの拡張機能ページで開発者モードを有効にし、「パッケージ化されていない拡張機能を読み込む」をクリックして、`build/chrome-mv3-dev`を選択してロードします。

## プロダクションビルド

以下のコマンドを実行します：

```bash
pnpm build
```

`build`フォルダにビルドされたファイルが生成されます。

## 開発ガイド

### 参考ドキュメント

[Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)

[Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

[Plasmo Docs](https://docs.plasmo.com/)

### ファイル構造

> src/sync：異なるプラットフォームの操作に関するコードを格納するフォルダです。dynamicは動的投稿関連、videoは動画投稿関連のコードです。追加されたプラットフォームはすべてcommon.tsに登録する必要があります。
> components：フロントエンドインターフェースの操作に関するすべてのコンポーネントを格納するフォルダです。

### 開発環境

パッケージマネージャーとして`pnpm@latest-9`の使用を推奨します。

## お問い合わせ

- QQグループ: [921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- メール: support@leaper.one
- GitHub Issues: https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![QQグループ](MultiPost-Extension_2025-02-28T14_17_15.717Z.png) 