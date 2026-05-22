import type { PlatformInfo } from "./common";
import { PodcastLiZhi } from "./podcast/lizhi";
import { PodcastNetease } from "./podcast/netease";
import { PodcastQingting } from "./podcast/qingting";
import { PodcastQQMusic } from "./podcast/qqmusic";
import { PodcastXiaoyuzhou } from "./podcast/xiaoyuzhou";
import { PodcastXimalaya } from "./podcast/ximalaya";

export const PodcastInfoMap: Record<string, PlatformInfo> = {
  PODCAST_QQMUSIC: {
    type: "PODCAST",
    name: "PODCAST_QQMUSIC",
    homeUrl: "https://mp.tencentmusic.com/index",
    faviconUrl: "https://mp.tencentmusic.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformQQMusic"),
    injectUrl: "https://mp.tencentmusic.com/index",
    injectFunction: PodcastQQMusic,
    tags: ["CN"],
    accountKey: "qqmusic",
  },
  PODCAST_LIZHI: {
    type: "PODCAST",
    name: "PODCAST_LIZHI",
    homeUrl: "https://nj.lizhi.fm/static/newsite/#/index",
    faviconUrl: "https://nj.lizhi.fm/static/newsite/logo240.png",
    platformName: chrome.i18n.getMessage("platformLizhi"),
    injectUrl: "https://nj.lizhi.fm/static/newsite/#/index",
    injectFunction: PodcastLiZhi,
    tags: ["CN"],
    accountKey: "lizhi",
  },
  PODCAST_XIMALAYA: {
    type: "PODCAST",
    name: "PODCAST_XIMALAYA",
    homeUrl: "https://creator.ximalaya.com/",
    faviconUrl: "https://www.ximalaya.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformXimalaya"),
    injectUrl: "https://creator.ximalaya.com/anchor/sound-album/sound/single-upload",
    injectFunction: PodcastXimalaya,
    tags: ["CN"],
    accountKey: "ximalaya",
  },
  PODCAST_XIAOYUZHOU: {
    type: "PODCAST",
    name: "PODCAST_XIAOYUZHOU",
    homeUrl: "https://podcaster.xiaoyuzhoufm.com/",
    faviconUrl: "https://www.xiaoyuzhoufm.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformXiaoyuzhou"),
    injectUrl: "https://podcaster.xiaoyuzhoufm.com/dashboard/episodes/new",
    injectFunction: PodcastXiaoyuzhou,
    tags: ["CN"],
    accountKey: "xiaoyuzhou",
  },
  PODCAST_QINGTING: {
    type: "PODCAST",
    name: "PODCAST_QINGTING",
    homeUrl: "https://studio.qingting.fm/",
    faviconUrl: "https://www.qingting.fm/favicon.ico",
    platformName: chrome.i18n.getMessage("platformQingting"),
    injectUrl: "https://studio.qingting.fm/album",
    injectFunction: PodcastQingting,
    tags: ["CN"],
    accountKey: "qingting",
  },
  PODCAST_NETEASE: {
    type: "PODCAST",
    name: "PODCAST_NETEASE",
    homeUrl: "https://podcast.music.163.com/",
    faviconUrl: "https://s4.music.126.net/style/favicon.ico",
    platformName: chrome.i18n.getMessage("platformNeteasePodcast"),
    injectUrl: "https://podcast.music.163.com/web/podcast/upload",
    injectFunction: PodcastNetease,
    tags: ["CN"],
    accountKey: "neteasepodcast",
  },
};
