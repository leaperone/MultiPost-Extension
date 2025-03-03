import type { PlatformInfo } from './common';
import { DynamicBaijiahao } from './dynamic/baijiahao';
import { DynamicBilibili } from './dynamic/bilibili';
import { DynamicBluesky } from './dynamic/bluesky';
import { DynamicDouyin } from './dynamic/douyin';
import { DynamicFacebook } from './dynamic/facebook';
import { DynamicInstagram } from './dynamic/instagram';
import { DynamicKuaishou } from './dynamic/kuaishou';
import { DynamicLinkedin } from './dynamic/linkedin';
import { DynamicOkjike } from './dynamic/okjike';
import { DynamicReddit } from './dynamic/reddit';
import { DynamicRednote } from './dynamic/rednote';
import { DynamicThreads } from './dynamic/threads';
import { DynamicToutiao } from './dynamic/toutiao';
import { DynamicWeibo } from './dynamic/weibo';
import { DynamicWeiXinChannel } from './dynamic/weixinchannel';
import { DynamicX } from './dynamic/x';
import { DynamicXueqiu } from './dynamic/xueqiu';
import { DynamicZhihu } from './dynamic/zhihu';

export const DynamicInfoMap: Record<string, PlatformInfo> = {
  DYNAMIC_X: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_X',
    homeUrl: 'https://x.com/home',
    faviconUrl: 'https://x.com/favicon.ico',
    iconifyIcon: 'simple-icons:x',
    platformName: chrome.i18n.getMessage('platformX'),
    injectUrl: 'https://x.com/home',
    injectFunction: DynamicX,
  },
  DYNAMIC_BILIBILI: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BILIBILI',
    homeUrl: 'https://t.bilibili.com',
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico',
    iconifyIcon: 'ant-design:bilibili-outlined',
    platformName: chrome.i18n.getMessage('platformBilibili'),
    injectUrl: 'https://t.bilibili.com',
    injectFunction: DynamicBilibili,
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
  },
  DYNAMIC_WEIBO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIBO',
    homeUrl: 'https://weibo.com',
    faviconUrl: 'https://weibo.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformWeibo'),
    injectUrl: 'https://weibo.com',
    injectFunction: DynamicWeibo,
  },
  DYNAMIC_XUEQIU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_XUEQIU',
    homeUrl: 'https://xueqiu.com',
    faviconUrl: 'https://xueqiu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformXueqiu'),
    injectUrl: 'https://xueqiu.com',
    injectFunction: DynamicXueqiu,
  },
  DYNAMIC_ZHIHU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_ZHIHU',
    homeUrl: 'https://www.zhihu.com',
    faviconUrl: 'https://www.zhihu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformZhihu'),
    injectUrl: 'https://www.zhihu.com',
    injectFunction: DynamicZhihu,
  },
  DYNAMIC_DOUYIN: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_DOUYIN',
    homeUrl: 'https://creator.douyin.com/',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouyin'),
    injectUrl: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    injectFunction: DynamicDouyin,
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
  },
  DYNAMIC_OKJIKE: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_OKJIKE',
    homeUrl: 'https://web.okjike.com',
    faviconUrl: 'https://web.okjike.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformOkjike'),
    injectUrl: 'https://web.okjike.com',
    injectFunction: DynamicOkjike,
  },
  DYNAMIC_REDDIT: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_REDDIT',
    homeUrl: 'https://www.reddit.com/',
    faviconUrl: 'https://www.reddit.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformReddit'),
    injectUrl: 'https://www.reddit.com/submit?type=TEXT',
    injectFunction: DynamicReddit,
  },
  DYNAMIC_KUAISHOU: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_KUAISHOU',
    homeUrl: 'https://cp.kuaishou.com/',
    faviconUrl: 'https://www.kuaishou.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformKuaishou'),
    injectUrl: 'https://cp.kuaishou.com/article/publish/video',
    injectFunction: DynamicKuaishou,
  },
  DYNAMIC_BAIJIAHAO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BAIJIAHAO',
    homeUrl: 'https://baijiahao.baidu.com/',
    faviconUrl: 'https://pic.rmb.bdstatic.com/10e1e2b43c35577e1315f0f6aad6ba24.vnd.microsoft.icon',
    platformName: chrome.i18n.getMessage('platformBaijiahao'),
    injectUrl: 'https://baijiahao.baidu.com/builder/rc/edit?type=events',
    injectFunction: DynamicBaijiahao,
  },
  DYNAMIC_TOUTIAO: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_TOUTIAO',
    homeUrl: 'https://mp.toutiao.com/',
    faviconUrl: 'https://sf1-cdn-tos.toutiaostatic.com/obj/ttfe/pgcfe/sz/mp_logo.png',
    platformName: chrome.i18n.getMessage('platformToutiao'),
    injectUrl: 'https://mp.toutiao.com/profile_v4/weitoutiao/publish',
    injectFunction: DynamicToutiao,
  },
  DYNAMIC_THREADS: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_THREADS',
    homeUrl: 'https://www.threads.net/web',
    faviconUrl: 'https://static.cdninstagram.com/rsrc.php/ye/r/lEu8iVizmNW.ico',
    platformName: chrome.i18n.getMessage('platformThreads'),
    injectUrl: 'https://www.threads.net/web',
    injectFunction: DynamicThreads,
  },
  DYNAMIC_WEIXINCHANNEL: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_WEIXINCHANNEL',
    homeUrl: 'https://channels.weixin.qq.com/platform',
    faviconUrl: 'https://res.wx.qq.com/t/wx_fed/finder/helper/finder-helper-web/res/favicon-v2.ico',
    platformName: chrome.i18n.getMessage('platformWeiXinVideo'),
    injectUrl: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    injectFunction: DynamicWeiXinChannel,
  },
  DYNAMIC_BLUESKY: {
    type: 'DYNAMIC',
    name: 'DYNAMIC_BLUESKY',
    homeUrl: 'https://bsky.app/',
    faviconUrl: 'https://web-cdn.bsky.app/static/favicon-32x32.png',
    platformName: chrome.i18n.getMessage('platformBluesky'),
    injectUrl: 'https://bsky.app/',
    injectFunction: DynamicBluesky,
  },
};
