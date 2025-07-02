import type { PlatformInfo } from './common';
import { DynamicBaijiahao } from './dynamic/baijiahao';
import { DynamicBilibili } from './dynamic/bilibili';
import { DynamicBluesky } from './dynamic/bluesky';
import { DynamicDedao } from './dynamic/dedao';
import { DynamicDouban } from './dynamic/douban';
import { DynamicDouyin } from './dynamic/douyin';
import { DynamicFacebook } from './dynamic/facebook';
import { DynamicWebhook } from './dynamic/webhook';
import { DynamicInstagram } from './dynamic/instagram';
import { DynamicKuaishou } from './dynamic/kuaishou';
import { DynamicLinkedin } from './dynamic/linkedin';
import { DynamicOkjike } from './dynamic/okjike';
import { DynamicReddit } from './dynamic/reddit';
import { DynamicRednote } from './dynamic/rednote';
import { DynamicThreads } from './dynamic/threads';
import { DynamicToutiao } from './dynamic/toutiao';
import { DynamicV2EX } from './dynamic/v2ex';
import { DynamicWeibo } from './dynamic/weibo';
import { DynamicWeixin } from './dynamic/weixin';
import { DynamicWeiXinChannel } from './dynamic/weixinchannel';
import { DynamicX } from './dynamic/x';
import { DynamicXueqiu } from './dynamic/xueqiu';
import { DynamicZhihu } from './dynamic/zhihu';
import { DynamicZSXQ } from './dynamic/zsxq';
import { DynamicXiaoheihe } from './dynamic/xiaoheihe';

export const DynamicInfoMap: Record<string, PlatformInfo> = {
  DYNAMIC_BILIBILI: {
    type: 'DYNAMIC', // 标识该平台为动态发布平台
    name: 'DYNAMIC_BILIBILI', // 平台名称，全局唯一
    homeUrl: 'https://t.bilibili.com', // 平台首页，可以任意填写，可以填写为登录页面
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico', // 平台图标，可以在 F12 中找到网站的 Favicon 图标的地址
    iconifyIcon: 'ant-design:bilibili-outlined', // 平台图标，可以在 [Iconify](https://icones.js.org/) 中找到图标，该字段非必须
    platformName: chrome.i18n.getMessage('platformBilibili'), // 平台名称 | i18n 国际化
    injectUrl: 'https://t.bilibili.com', // 动态发布页面，实际脚本执行的时候会首先打开该页面并注入脚本
    injectFunction: DynamicBilibili, // 动态发布函数，该函数会根据 `injectUrl` 打开的页面然后将其注入到页面中
    tags: ['CN'], // 平台标签 | CN 标签标识该平台为中文平台 （该标签为默认标签，类似的还有 EN 标签标识该平台为英文平台）
    accountKey: 'bilibili', // 平台账号，该字段用于区分不同平台的账号，实际脚本执行的时候会根据该字段去 `src/sync/account/bilibili.ts` 文件中找到对应的账号信息
  },
  DYNAMIC_DOUYIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DOUYIN',
    homeUrl: 'https://creator.douyin.com/',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouyin'),
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    injectFunction: DynamicDouyin,
    tags: ['CN'],
    accountKey: 'douyin',
  },
  DYNAMIC_X: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_X',
    homeUrl: 'https://x.com/home',
    faviconUrl: 'https://x.com/favicon.ico',
    iconifyIcon: 'simple-icons:x',
    platformName: chrome.i18n.getMessage('platformX'),
    injectUrl: 'https://x.com/home',
    injectFunction: DynamicX,
    tags: ['International'],
    accountKey: 'x',
  },
  DYNAMIC_REDNOTE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_REDNOTE',
    homeUrl: 'https://creator.xiaohongshu.com/',
    faviconUrl: 'https://fe-video-qc.xhscdn.com/fe-platform/ed8fe781ce9e16c1bfac2cd962f0721edabe2e49.ico',
    iconifyIcon: 'simple-icons:xiaohongshu',
    platformName: chrome.i18n.getMessage('platformRednote'),
    injectUrl: 'https://creator.xiaohongshu.com/publish/publish',
    injectFunction: DynamicRednote,
    tags: ['CN'],
    accountKey: 'rednote',
  },
  DYNAMIC_WEIBO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIBO',
    homeUrl: 'https://weibo.com',
    faviconUrl: 'https://weibo.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformWeibo'),
    injectUrl: 'https://weibo.com',
    injectFunction: DynamicWeibo,
    tags: ['CN'],
    accountKey: 'weibo',
  },
  DYNAMIC_XUEQIU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_XUEQIU',
    homeUrl: 'https://xueqiu.com',
    faviconUrl: 'https://xueqiu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformXueqiu'),
    injectUrl: 'https://xueqiu.com',
    injectFunction: DynamicXueqiu,
    tags: ['CN'],
    accountKey: 'xueqiu',
  },
  DYNAMIC_ZHIHU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_ZHIHU',
    homeUrl: 'https://www.zhihu.com',
    faviconUrl: 'https://www.zhihu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformZhihu'),
    injectUrl: 'https://www.zhihu.com',
    injectFunction: DynamicZhihu,
    tags: ['CN'],
    accountKey: 'zhihu',
  },
  DYNAMIC_INSTAGRAM: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_INSTAGRAM',
    homeUrl: 'https://www.instagram.com/',
    faviconUrl: 'https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png',
    iconifyIcon: 'simple-icons:instagram',
    platformName: chrome.i18n.getMessage('platformInstagram'),
    injectUrl: 'https://www.instagram.com/',
    injectFunction: DynamicInstagram,
    tags: ['International'],
    accountKey: 'instagram',
  },
  DYNAMIC_FACEBOOK: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_FACEBOOK',
    homeUrl: 'https://www.facebook.com/',
    faviconUrl: 'https://static.xx.fbcdn.net/rsrc.php/yT/r/aGT3gskzWBf.ico',
    iconifyIcon: 'simple-icons:facebook',
    platformName: chrome.i18n.getMessage('platformFacebook'),
    injectUrl: 'https://www.facebook.com/',
    injectFunction: DynamicFacebook,
    tags: ['International'],
    accountKey: 'facebook',
  },
  DYNAMIC_LINKEDIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_LINKEDIN',
    homeUrl: 'https://www.linkedin.com/',
    faviconUrl: 'https://static.licdn.com/aero-v1/sc/h/eahiplrwoq61f4uan012ia17i',
    iconifyIcon: 'simple-icons:linkedin',
    platformName: chrome.i18n.getMessage('platformLinkedin'),
    injectUrl: 'https://www.linkedin.com/feed',
    injectFunction: DynamicLinkedin,
    tags: ['International'],
    accountKey: 'linkedin',
  },
  DYNAMIC_OKJIKE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_OKJIKE',
    homeUrl: 'https://web.okjike.com',
    faviconUrl: 'https://web.okjike.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformOkjike'),
    injectUrl: 'https://web.okjike.com',
    injectFunction: DynamicOkjike,
    tags: ['CN'],
    accountKey: 'okjike',
  },
  DYNAMIC_REDDIT: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_REDDIT',
    homeUrl: 'https://www.reddit.com/',
    faviconUrl: 'https://www.reddit.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformReddit'),
    injectUrl: 'https://www.reddit.com/submit?type=TEXT',
    injectFunction: DynamicReddit,
    tags: ['International'],
    accountKey: 'reddit',
  },
  DYNAMIC_KUAISHOU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_KUAISHOU',
    homeUrl: 'https://cp.kuaishou.com/',
    faviconUrl: 'https://www.kuaishou.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformKuaishou'),
    injectUrl: 'https://cp.kuaishou.com/article/publish/video',
    injectFunction: DynamicKuaishou,
    tags: ['CN'],
    accountKey: 'kuaishou',
  },
  DYNAMIC_BAIJIAHAO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BAIJIAHAO',
    homeUrl: 'https://baijiahao.baidu.com/',
    faviconUrl: 'https://pic.rmb.bdstatic.com/10e1e2b43c35577e1315f0f6aad6ba24.vnd.microsoft.icon',
    platformName: chrome.i18n.getMessage('platformBaijiahao'),
    injectUrl: 'https://baijiahao.baidu.com/builder/rc/edit?type=events',
    injectFunction: DynamicBaijiahao,
    tags: ['CN'],
    accountKey: 'baijiahao',
  },
  DYNAMIC_TOUTIAO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_TOUTIAO',
    homeUrl: 'https://mp.toutiao.com/',
    faviconUrl: 'https://sf1-cdn-tos.toutiaostatic.com/obj/ttfe/pgcfe/sz/mp_logo.png',
    platformName: chrome.i18n.getMessage('platformToutiao'),
    injectUrl: 'https://mp.toutiao.com/profile_v4/weitoutiao/publish',
    injectFunction: DynamicToutiao,
    tags: ['CN'],
    accountKey: 'toutiao',
  },
  DYNAMIC_THREADS: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_THREADS',
    homeUrl: 'https://www.threads.net/web',
    faviconUrl: 'https://static.cdninstagram.com/rsrc.php/ye/r/lEu8iVizmNW.ico',
    platformName: chrome.i18n.getMessage('platformThreads'),
    injectUrl: 'https://www.threads.net/web',
    injectFunction: DynamicThreads,
    tags: ['International'],
    accountKey: 'threads',
  },
  DYNAMIC_WEIXINCHANNEL: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIXINCHANNEL',
    homeUrl: 'https://channels.weixin.qq.com/platform',
    faviconUrl: 'https://res.wx.qq.com/t/wx_fed/finder/helper/finder-helper-web/res/favicon-v2.ico',
    platformName: chrome.i18n.getMessage('platformWeiXinVideo'),
    injectUrl: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    injectFunction: DynamicWeiXinChannel,
    tags: ['CN'],
    accountKey: 'weixinchannel',
  },
  DYNAMIC_BLUESKY: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BLUESKY',
    homeUrl: 'https://bsky.app/',
    faviconUrl: 'https://web-cdn.bsky.app/static/favicon-32x32.png',
    platformName: chrome.i18n.getMessage('platformBluesky'),
    injectUrl: 'https://bsky.app/',
    injectFunction: DynamicBluesky,
    tags: ['International'],
    accountKey: 'bluesky',
  },
  DYNAMIC_V2EX: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_V2EX',
    homeUrl: 'https://www.v2ex.com/',
    faviconUrl: 'https://www.v2ex.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformV2ex'),
    injectUrl: 'https://www.v2ex.com/write',
    injectFunction: DynamicV2EX,
    tags: ['CN'],
    accountKey: 'v2ex',
  },
  DYNAMIC_DOUBAN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DOUBAN',
    homeUrl: 'https://www.douban.com/',
    faviconUrl: 'https://www.douban.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouban'),
    injectUrl: 'https://www.douban.com/',
    injectFunction: DynamicDouban,
    tags: ['CN'],
    accountKey: 'douban',
  },
  DYNAMIC_DEDAO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DEDAO',
    homeUrl: 'https://www.dedao.cn/',
    faviconUrl: 'https://www.dedao.cn/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDedao'),
    injectUrl: 'https://www.dedao.cn/knowledge/home',
    injectFunction: DynamicDedao,
    tags: ['CN'],
    accountKey: 'dedao',
  },
  DYNAMIC_WEIXIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIXIN',
    homeUrl: 'https://mp.weixin.qq.com/',
    faviconUrl: 'https://mp.weixin.qq.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformWeixin'),
    injectUrl: 'https://mp.weixin.qq.com/',
    injectFunction: DynamicWeixin,
    tags: ['CN'],
    accountKey: 'weixin',
  },
  DYNAMIC_WEBHOOK: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEBHOOK',
    homeUrl: 'https://multipost.app/about/',
    faviconUrl: 'https://multipost.app/favicon.ico',
    platformName: chrome.i18n.getMessage('platformWebhook'),
    injectUrl: 'https://multipost.app/about/',
    injectFunction: DynamicWebhook,
    tags: ['International'],
    accountKey: 'webhook',
  },
  DYNAMIC_ZSXQ: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_ZSXQ',
    homeUrl: 'https://wx.zsxq.com/',
    faviconUrl: 'https://wx.zsxq.com/assets_dweb/images/favicon_32.ico',
    platformName: chrome.i18n.getMessage('platformZSXQ'),
    injectUrl: 'https://wx.zsxq.com/',
    injectFunction: DynamicZSXQ,
    tags: ['CN'],
    accountKey: 'zsxq',
  },
  DYNAMIC_XIAOHEIHE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_XIAOHEIHE',
    homeUrl: 'https://www.xiaoheihe.cn/',
    faviconUrl: 'https://www.xiaoheihe.cn/favicon.ico',
    platformName: chrome.i18n.getMessage('platformXiaoheihe'),
    injectUrl: 'https://www.xiaoheihe.cn/creator/editor/draft/image_text',
    injectFunction: DynamicXiaoheihe,
    tags: ['CN'],
    accountKey: 'xiaoheihe',
  },
};
