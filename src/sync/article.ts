import { ArticleBaijiahao } from './article/baijiahao';
import { ArticleCSDN } from './article/csdn';
import { ArticleDouban } from './article/douban';
import { ArticleJianshu } from './article/jianshu';
import { ArticleJuejin } from './article/juejin';
import { ArticleSegmentfault } from './article/segmentfault';
import { ArticleToutiao } from './article/toutiao';
import { ArticleZhihu } from './article/zhihu';
import type { PlatformInfo } from './common';

export const ArticleInfoMap: Record<string, PlatformInfo> = {
  ARTICLE_CSDN: {
    type: 'ARTICLE',
    name: 'ARTICLE_CSDN',
    homeUrl: 'https://mp.csdn.net/mp_blog/creation/editor',
    faviconUrl: 'https://g.csdnimg.cn/static/logo/favicon32.ico',
    platformName: chrome.i18n.getMessage('platformCSDN'),
    injectUrl: 'https://mp.csdn.net/mp_blog/creation/editor',
    injectFunction: ArticleCSDN,
  },
  ARTICLE_ZHIHU: {
    type: 'ARTICLE',
    name: 'ARTICLE_ZHIHU',
    homeUrl: 'https://zhuanlan.zhihu.com/write',
    faviconUrl: 'https://www.zhihu.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformZhihu'),
    injectUrl: 'https://zhuanlan.zhihu.com/write',
    injectFunction: ArticleZhihu,
  },
  ARTICLE_JUEJIN: {
    type: 'ARTICLE',
    name: 'ARTICLE_JUEJIN',
    homeUrl: 'https://juejin.cn/editor/drafts/new?v=2',
    faviconUrl: 'https://lf-web-assets.juejin.cn/obj/juejin-web/xitu_juejin_web/static/favicons/apple-touch-icon.png',
    platformName: chrome.i18n.getMessage('platformJuejin'),
    injectUrl: 'https://juejin.cn/editor/drafts/new?v=2',
    injectFunction: ArticleJuejin,
  },
  ARTICLE_JIANSHU: {
    type: 'ARTICLE',
    name: 'ARTICLE_JIANSHU',
    homeUrl: 'https://www.jianshu.com/writer',
    faviconUrl: 'https://cdn2.jianshu.io/writer/favicon.c183daf7eab8ea4c81a845f12734f77f.ico',
    platformName: chrome.i18n.getMessage('platformJianshu'),
    injectUrl: 'https://www.jianshu.com/writer',
    injectFunction: ArticleJianshu,
  },
  ARTICLE_SEGMENTFAULT: {
    type: 'ARTICLE',
    name: 'ARTICLE_SEGMENTFAULT',
    homeUrl: 'https://segmentfault.com/write',
    faviconUrl: 'https://static.segmentfault.com/main_site_next/d937cc1d/touch-icon.png',
    platformName: chrome.i18n.getMessage('platformSegmentfault'),
    injectUrl: 'https://segmentfault.com/write',
    injectFunction: ArticleSegmentfault,
  },
  ARTICLE_BAIJIAHAO: {
    type: 'ARTICLE',
    name: 'ARTICLE_BAIJIAHAO',
    homeUrl: 'https://baijiahao.baidu.com/',
    faviconUrl: 'https://pic.rmb.bdstatic.com/10e1e2b43c35577e1315f0f6aad6ba24.vnd.microsoft.icon',
    platformName: chrome.i18n.getMessage('platformBaijiahao'),
    injectUrl: 'https://baijiahao.baidu.com/builder/rc/edit?type=news',
    injectFunction: ArticleBaijiahao,
  },
  ARTICLE_TOUTIAO: {
    type: 'ARTICLE',
    name: 'ARTICLE_TOUTIAO',
    homeUrl: 'https://mp.toutiao.com/',
    faviconUrl: 'https://sf1-cdn-tos.toutiaostatic.com/obj/ttfe/pgcfe/sz/mp_logo.png',
    platformName: chrome.i18n.getMessage('platformToutiao'),
    injectUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    injectFunction: ArticleToutiao,
  },
  ARTICLE_DOUBAN: {
    type: 'ARTICLE',
    name: 'ARTICLE_DOUBAN',
    homeUrl: 'https://www.douban.com/',
    faviconUrl: 'https://www.douban.com/favicon.ico',
    platformName: chrome.i18n.getMessage('platformDouban'),
    injectUrl: 'https://www.douban.com/note/create',
    injectFunction: ArticleDouban,
  },
};
