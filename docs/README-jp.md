<div align="center">

# MultiPost

![GitHub License GitHub許可証](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHubスター](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHubコミット活動](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension) [![Website ウェブサイト](https://img.shields.io/website?url=https%3A%2F%2Fmultipost.app)](https://multipost.app)

⭐ このプロジェクトが役立つと思われる場合は、スターを付けていただけると幸いです！皆様のサポートが私たちの成長と改善の原動力となります！⭐

[English](../README.md) | [中文](README-zh.md) | [日本語](README-jp.md) | [Français](README-fr.md) | [한국어](README-kr.md)

> 複数のソーシャルメディアプラットフォームにワンクリックでコンテンツを公開できるブラウザ拡張機能

</div>

---

<!-- 最新アップデート -->
<div align="center" style="background-color: #e4d6f5; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px #e4d6f5;">
  <h3>MultiPost Analytics: Web Trace</h3>
  <p>Web Trace: リアルタイムアクセス統計、訪問者分析、閲覧分析、滞在時間分析。</p>
  <p>リアルタイムアクセス統計、訪問者分析、閲覧分析、滞在時間分析を提供します。</p>
  <p>詳細はこちら：<a href="https://multipost.app/dashboard/webtrace">https://multipost.app/dashboard/webtrace</a></p>
</div>

---

## はじめに
- [multipost.app](https://multipost.app) - 公式ウェブサイト
- [MultiPost 記事エディター](https://md.multipost.app/) - [(リポジトリ)](https://github.com/leaper-one/multipost-wechat-markdown-editor) - 複数のプラットフォームにコンテンツを作成・投稿するためのオンラインエディター
- [Chrome拡張機能 - ![Chrome Web Store Version Chrome ウェブストアバージョン](https://img.shields.io/chrome-web-store/v/dhohkaclnjgcikfoaacfgijgjgceofih)](https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Users Chrome ウェブストアユーザー](https://img.shields.io/chrome-web-store/users/dhohkaclnjgcikfoaacfgijgjgceofih) ![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/dhohkaclnjgcikfoaacfgijgjgceofih)
- [Edge拡張機能 - ![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg) [![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fckoiphiceimehjkolnfffgbmihoppgjg)](https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg)

## 主な機能

- 知乎、Weibo、小紅書、TikTokなど10以上の主要プラットフォームへの同時投稿をサポート
- ログイン不要、登録不要、APIキー不要。無料！
- テキスト、画像、動画など、様々なコンテンツ形式をサポート
- ウェブページとの連携をサポートし、拡張機能の投稿機能を利用して独自のウェブページを開発し、自動化を設定可能：
  - ウェブコンテンツの自動取得と複数プラットフォームへの自動投稿
  - 投稿のスケジュール設定
  - AIコンテンツ生成との連携

この拡張機能は、コンテンツクリエイターが複数のプラットフォームに投稿する際の課題を解決します。一度の編集で、すべてのプラットフォームにコンテンツを同期投稿でき、作業効率を大幅に向上させます。

## 開発を始める

まず、開発サーバーを起動します：

```bash
pnpm i

pnpm dev
```

ブラウザの拡張機能ページで開発者モードを有効にし、`パッケージ化されていない拡張機能を読み込む`をクリックして、`build/chrome-mv3-dev`を選択してロードします。

## プロダクションビルド

以下のコマンドを実行します：

```bash
pnpm build
```

`build`フォルダにビルドされたコンテンツが格納されます。

## 開発ガイド

### 必要なドキュメント

[Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)

[Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

[Plasmo Docs](https://docs.plasmo.com/)

## おすすめの記事

- [AI全スタックガイド Vol.033：5分でマスターするコンテンツのワンクリックマルチプラットフォーム投稿](https://mp.weixin.qq.com/s/K7yh6EsBLOGJzl8Gh8SwLw)

### ファイル構造

> src/sync：異なるプラットフォームの操作に関するコードを格納するフォルダです。dynamicは動的投稿関連、videoは動画投稿関連です。追加されたプラットフォームはすべてcommon.tsに登録する必要があります。
> components：フロントエンドインターフェースの操作に関するすべてのコンポーネントを格納するフォルダです。

### 開発環境

パッケージマネージャーには `pnpm@latest-9`、Node.jsバージョン20の使用を推奨します。

## Star History

<a href="https://www.star-history.com/#leaper-one/MultiPost-Extension&leaper-one/multipost-wechat-markdown-editor&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=leaper-one/MultiPost-Extension,leaper-one/multipost-wechat-markdown-editor&type=Date" />
 </picture>
</a>

## お問い合わせ

- QQグループ：[921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- メール：support@leaper.one
- Twitter：[@harry_wong_](https://x.com/harry_wong_)
- GitHub Issues：https://github.com/MultiPost-Extension/MultiPost-Extension/issues

![QQグループ](MultiPost-Extension_2025-02-28T14_17_15.717Z.png)