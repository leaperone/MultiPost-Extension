import { Article51CTO } from "./article/51cto";
import { ArticleAliyun } from "./article/aliyun";
import { ArticleAutohome } from "./article/autohome";
import { ArticleBaijiahao } from "./article/baijiahao";
import { ArticleBilibili } from "./article/bilibili";
import { ArticleCSDN } from "./article/csdn";
import { ArticleDingduanhao } from "./article/dingduanhao";
import { ArticleDongchedi } from "./article/dongchedi";
import { ArticleDouban } from "./article/douban";
import { ArticleEastmoney } from "./article/eastmoney";
import { ArticleInfoQ } from "./article/infoq";
import { ArticleJianpian } from "./article/jianpian";
import { ArticleJianshu } from "./article/jianshu";
import { ArticleJuejin } from "./article/juejin";
import { ArticleKuaichuanhao } from "./article/kuaichuanhao";
import { ArticleMedium } from "./article/medium";
import { ArticleNetease } from "./article/netease";
import { ArticleOSChina } from "./article/oschina";
import { ArticleQQ } from "./article/qq";
import { ArticleSegmentfault } from "./article/segmentfault";
import { ArticleSMZDM } from "./article/smzdm";
import { ArticleSohu } from "./article/sohu";
import { ArticleSSPai } from "./article/sspai";
import { ArticleSubstack } from "./article/substack";
import { ArticleTencentyun } from "./article/tencentyun";
import { ArticleTonghuashun } from "./article/tonghuashun";
import { ArticleToutiao } from "./article/toutiao";
import { ArticleWeibo } from "./article/weibo";
import { ArticleWeixin } from "./article/weixin";
import { ArticleWordpress } from "./article/wordpress";
import { ArticleWoshipm } from "./article/woshipm";
import { ArticleXArticle } from "./article/xarticle";
import { ArticleXueqiu } from "./article/xueqiu";
import { ArticleYidianzixun } from "./article/yidianzixun";
import { ArticleZhihu } from "./article/zhihu";
import { ArticleZsxq } from "./article/zsxq";
import type { PlatformInfo } from "./common";

export const ArticleInfoMap: Record<string, PlatformInfo> = {
  ARTICLE_CSDN: {
    type: "ARTICLE",
    name: "ARTICLE_CSDN",
    homeUrl: "https://mp.csdn.net/mp_blog/creation/editor",
    faviconUrl: "https://g.csdnimg.cn/static/logo/favicon32.ico",
    platformName: chrome.i18n.getMessage("platformCSDN"),
    injectUrl: "https://mp.csdn.net/mp_blog/creation/editor",
    injectFunction: ArticleCSDN,
    tags: ["CN"],
    accountKey: "csdn",
  },
  ARTICLE_ZHIHU: {
    type: "ARTICLE",
    name: "ARTICLE_ZHIHU",
    homeUrl: "https://zhuanlan.zhihu.com/write",
    faviconUrl: "https://www.zhihu.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformZhihu"),
    injectUrl: "https://zhuanlan.zhihu.com/write",
    injectFunction: ArticleZhihu,
    tags: ["CN"],
    accountKey: "zhihu",
  },
  ARTICLE_JUEJIN: {
    type: "ARTICLE",
    name: "ARTICLE_JUEJIN",
    homeUrl: "https://juejin.cn/editor/drafts/new?v=2",
    faviconUrl: "https://lf-web-assets.juejin.cn/obj/juejin-web/xitu_juejin_web/static/favicons/apple-touch-icon.png",
    platformName: chrome.i18n.getMessage("platformJuejin"),
    injectUrl: "https://juejin.cn/editor/drafts/new?v=2",
    injectFunction: ArticleJuejin,
    tags: ["CN"],
    accountKey: "juejin",
  },
  ARTICLE_JIANSHU: {
    type: "ARTICLE",
    name: "ARTICLE_JIANSHU",
    homeUrl: "https://www.jianshu.com/writer",
    faviconUrl: "https://cdn2.jianshu.io/writer/favicon.c183daf7eab8ea4c81a845f12734f77f.ico",
    platformName: chrome.i18n.getMessage("platformJianshu"),
    injectUrl: "https://www.jianshu.com/writer",
    injectFunction: ArticleJianshu,
    tags: ["CN"],
    accountKey: "jianshu",
  },
  ARTICLE_SEGMENTFAULT: {
    type: "ARTICLE",
    name: "ARTICLE_SEGMENTFAULT",
    homeUrl: "https://segmentfault.com/write",
    faviconUrl: "https://static.segmentfault.com/main_site_next/d937cc1d/touch-icon.png",
    platformName: chrome.i18n.getMessage("platformSegmentfault"),
    injectUrl: "https://segmentfault.com/write",
    injectFunction: ArticleSegmentfault,
    tags: ["CN"],
    accountKey: "segmentfault",
  },
  // experimental(待线上验证):Aliyun ARTICLE DOM 路径
  ARTICLE_ALIYUN: {
    type: "ARTICLE",
    name: "ARTICLE_ALIYUN",
    homeUrl: "https://developer.aliyun.com/",
    faviconUrl: "https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico",
    platformName: chrome.i18n.getMessage("platformAliyun"),
    injectUrl: "https://developer.aliyun.com/article/new",
    injectFunction: ArticleAliyun,
    tags: ["CN"],
    accountKey: "aliyun",
  },
  // experimental(待线上验证):TencentYun ARTICLE DOM 路径
  ARTICLE_TENCENTYUN: {
    type: "ARTICLE",
    name: "ARTICLE_TENCENTYUN",
    homeUrl: "https://cloud.tencent.com/developer",
    faviconUrl: "https://cloud.tencent.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformTencentyun"),
    injectUrl: "https://cloud.tencent.com/developer/article/write-new",
    injectFunction: ArticleTencentyun,
    tags: ["CN"],
    accountKey: "tencentyun",
  },
  ARTICLE_BAIJIAHAO: {
    type: "ARTICLE",
    name: "ARTICLE_BAIJIAHAO",
    homeUrl: "https://baijiahao.baidu.com/",
    faviconUrl: "https://pic.rmb.bdstatic.com/10e1e2b43c35577e1315f0f6aad6ba24.vnd.microsoft.icon",
    platformName: chrome.i18n.getMessage("platformBaijiahao"),
    injectUrl: "https://baijiahao.baidu.com/builder/rc/edit?type=news",
    injectFunction: ArticleBaijiahao,
    tags: ["CN"],
    accountKey: "baijiahao",
  },
  ARTICLE_TOUTIAO: {
    type: "ARTICLE",
    name: "ARTICLE_TOUTIAO",
    homeUrl: "https://mp.toutiao.com/",
    faviconUrl: "https://sf1-cdn-tos.toutiaostatic.com/obj/ttfe/pgcfe/sz/mp_logo.png",
    platformName: chrome.i18n.getMessage("platformToutiao"),
    injectUrl: "https://mp.toutiao.com/profile_v4/graphic/publish",
    injectFunction: ArticleToutiao,
    tags: ["CN"],
    accountKey: "toutiao",
  },
  // experimental(待线上验证):QQ ARTICLE DOM 路径
  ARTICLE_QQ: {
    type: "ARTICLE",
    name: "ARTICLE_QQ",
    homeUrl: "https://om.qq.com/",
    faviconUrl: "https://om.qq.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformQiE"),
    injectUrl: "https://om.qq.com/main/creation/article",
    injectFunction: ArticleQQ,
    tags: ["CN"],
    accountKey: "qie",
  },
  ARTICLE_DOUBAN: {
    type: "ARTICLE",
    name: "ARTICLE_DOUBAN",
    homeUrl: "https://www.douban.com/",
    faviconUrl: "https://www.douban.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformDouban"),
    injectUrl: "https://www.douban.com/note/create",
    injectFunction: ArticleDouban,
    tags: ["CN"],
    accountKey: "douban",
  },
  ARTICLE_WEIXIN: {
    type: "ARTICLE",
    name: "ARTICLE_WEIXIN",
    homeUrl: "https://mp.weixin.qq.com/",
    faviconUrl: "https://mp.weixin.qq.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformWeixin"),
    injectUrl: "https://mp.weixin.qq.com/",
    injectFunction: ArticleWeixin,
    tags: ["CN"],
    accountKey: "weixin",
  },
  ARTICLE_WORDPRESS: {
    type: "ARTICLE",
    name: "ARTICLE_WORDPRESS",
    homeUrl: "https://wordpress.com/wp-admin/",
    faviconUrl: "https://s1.wp.com/i/favicon.ico",
    platformName: chrome.i18n.getMessage("platformWordpress"),
    injectUrl: "https://wordpress.com/wp-admin/new-post.php",
    injectFunction: ArticleWordpress,
    tags: ["International"],
    accountKey: "wordpress",
  },
  ARTICLE_BILIBILI: {
    type: "ARTICLE",
    name: "ARTICLE_BILIBILI",
    homeUrl: "https://www.bilibili.com/",
    faviconUrl: "https://www.bilibili.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformBilibili"),
    injectUrl: "https://member.bilibili.com/article-text/home?newEditor=-1",
    injectFunction: ArticleBilibili,
    tags: ["CN"],
    accountKey: "bilibili",
  },
  ARTICLE_SSPAI: {
    type: "ARTICLE",
    name: "ARTICLE_SSPAI",
    homeUrl: "https://sspai.com/",
    faviconUrl: "https://cdn-static.sspai.com/favicon/sspai.ico",
    platformName: chrome.i18n.getMessage("platformSSPai"),
    injectUrl: "https://sspai.com/write",
    injectFunction: ArticleSSPai,
    tags: ["CN"],
    accountKey: "sspai",
  },
  ARTICLE_51CTO: {
    type: "ARTICLE",
    name: "ARTICLE_51CTO",
    homeUrl: "https://www.51cto.com/",
    faviconUrl: "https://blog.51cto.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platform51CTO"),
    injectUrl: "https://blog.51cto.com/blogger/publish?old=1",
    injectFunction: Article51CTO,
    tags: ["CN"],
    accountKey: "51cto",
  },
  ARTICLE_XUEQIU: {
    type: "ARTICLE",
    name: "ARTICLE_XUEQIU",
    homeUrl: "https://xueqiu.com/",
    faviconUrl: "https://assets.imedao.com/images/favicon.png",
    platformName: chrome.i18n.getMessage("platformXueqiu"),
    injectUrl: "https://mp.xueqiu.com/writeV2?position=pc_home_primary",
    injectFunction: ArticleXueqiu,
    tags: ["CN"],
    accountKey: "xueqiu",
  },
  ARTICLE_WEIBO: {
    type: "ARTICLE",
    name: "ARTICLE_WEIBO",
    homeUrl: "https://weibo.com/",
    faviconUrl: "https://weibo.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformWeibo"),
    injectUrl: "https://card.weibo.com/article/v3/editor",
    injectFunction: ArticleWeibo,
    tags: ["CN"],
    accountKey: "weibo",
  },
  ARTICLE_EASTMONEY: {
    type: "ARTICLE",
    name: "ARTICLE_EASTMONEY",
    homeUrl: "https://www.eastmoney.com/",
    faviconUrl: "https://mycaifuhao.eastmoney.com/public/publish/favicon.ico",
    platformName: chrome.i18n.getMessage("platformEastmoney"),
    injectUrl: "https://mp.eastmoney.com/collect/pc_article/index.html",
    injectFunction: ArticleEastmoney,
    tags: ["CN"],
    accountKey: "eastmoney",
  },
  ARTICLE_SUBSTACK: {
    type: "ARTICLE",
    name: "ARTICLE_SUBSTACK",
    homeUrl: "https://substack.com/",
    faviconUrl: "https://substack.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformSubstack"),
    injectUrl: "https://substack.com/publish/post",
    injectFunction: ArticleSubstack,
    tags: ["International"],
    accountKey: "substack",
  },
  ARTICLE_MEDIUM: {
    type: "ARTICLE",
    name: "ARTICLE_MEDIUM",
    homeUrl: "https://medium.com/",
    faviconUrl: "https://medium.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformMedium"),
    injectUrl: "https://medium.com/new-story",
    injectFunction: ArticleMedium,
    tags: ["International"],
    accountKey: "medium",
  },
  ARTICLE_OSCHINA: {
    type: "ARTICLE",
    name: "ARTICLE_OSCHINA",
    homeUrl: "https://www.oschina.net/",
    faviconUrl: "https://www.oschina.net/favicon.ico",
    platformName: chrome.i18n.getMessage("platformOSChina"),
    injectUrl: "https://my.oschina.net/new/blog",
    injectFunction: ArticleOSChina,
    tags: ["CN"],
    accountKey: "oschina",
  },
  ARTICLE_INFOQ: {
    type: "ARTICLE",
    name: "ARTICLE_INFOQ",
    homeUrl: "https://www.infoq.cn/",
    faviconUrl: "https://static001.geekbang.org/infoq/favicon.ico",
    platformName: chrome.i18n.getMessage("platformInfoQ"),
    injectUrl: "https://xie.infoq.cn/",
    injectFunction: ArticleInfoQ,
    tags: ["CN"],
    accountKey: "infoq",
  },
  ARTICLE_SMZDM: {
    type: "ARTICLE",
    name: "ARTICLE_SMZDM",
    homeUrl: "https://www.smzdm.com/",
    faviconUrl: "https://www.smzdm.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformSMZDM"),
    injectUrl: "https://zhiyou.smzdm.com/user/article/post",
    injectFunction: ArticleSMZDM,
    tags: ["CN"],
    accountKey: "smzdm",
  },
  ARTICLE_WOSHIPM: {
    type: "ARTICLE",
    name: "ARTICLE_WOSHIPM",
    homeUrl: "https://www.woshipm.com/",
    faviconUrl: "https://www.woshipm.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformWoshipm"),
    injectUrl: "https://www.woshipm.com/wp-admin/post-new.php",
    injectFunction: ArticleWoshipm,
    tags: ["CN"],
    accountKey: "woshipm",
  },
  ARTICLE_AUTOHOME: {
    type: "ARTICLE",
    name: "ARTICLE_AUTOHOME",
    homeUrl: "https://www.autohome.com.cn/",
    faviconUrl: "https://www.autohome.com.cn/favicon.ico",
    platformName: chrome.i18n.getMessage("platformAutohome"),
    injectUrl: "https://chejiahao.autohome.com.cn/article/post.html",
    injectFunction: ArticleAutohome,
    tags: ["CN"],
    accountKey: "autohome",
  },
  // experimental(待线上验证):Jianpian ARTICLE DOM 路径
  ARTICLE_JIANPIAN: {
    type: "ARTICLE",
    name: "ARTICLE_JIANPIAN",
    homeUrl: "https://www.jianpian.cn/",
    faviconUrl: "https://ss2.meipian.me/editor-v3/webcdn/logo.ico",
    platformName: chrome.i18n.getMessage("platformJianpian"),
    injectUrl: "https://www.jianpian.cn/p/edit",
    injectFunction: ArticleJianpian,
    tags: ["CN"],
    accountKey: "jianpian",
  },
  // experimental(待线上验证):Tonghuashun ARTICLE DOM 路径
  ARTICLE_TONGHUASHUN: {
    type: "ARTICLE",
    name: "ARTICLE_TONGHUASHUN",
    homeUrl: "https://t.10jqka.com.cn/",
    faviconUrl: "https://t.10jqka.com.cn/circle/images/favicon.ico",
    platformName: chrome.i18n.getMessage("platformTonghuashun"),
    injectUrl: "https://t.10jqka.com.cn/newcircle/creation/postAll",
    injectFunction: ArticleTonghuashun,
    tags: ["CN"],
    accountKey: "tonghuashun",
  },
  // experimental(待线上验证):Dongchedi ARTICLE DOM 路径
  ARTICLE_DONGCHEDI: {
    type: "ARTICLE",
    name: "ARTICLE_DONGCHEDI",
    homeUrl: "https://mp.dcdapp.com/",
    faviconUrl: "https://p3-dcd.byteimg.com/obj/tos-cn-i-dcdx/4e214394e186b0a95bc9ab7fc5154770",
    platformName: chrome.i18n.getMessage("platformDongchedi"),
    injectUrl: "https://mp.dcdapp.com/profile_v2/publish/article",
    injectFunction: ArticleDongchedi,
    tags: ["CN"],
    accountKey: "dongchedi",
  },
  // experimental(待线上验证):Zsxq ARTICLE DOM 路径
  ARTICLE_ZSXQ: {
    type: "ARTICLE",
    name: "ARTICLE_ZSXQ",
    homeUrl: "https://wx.zsxq.com/",
    faviconUrl: "https://wx.zsxq.com/assets_dweb/images/favicon_32.ico",
    platformName: chrome.i18n.getMessage("platformZSXQ"),
    injectUrl: "https://wx.zsxq.com/",
    injectFunction: ArticleZsxq,
    tags: ["CN"],
    accountKey: "zsxq",
  },
  // experimental(待线上验证):163 DOM 路径,正文图片 CDN 重传需后续 API 化
  ARTICLE_NETEASE: {
    type: "ARTICLE",
    name: "ARTICLE_NETEASE",
    homeUrl: "https://mp.163.com/",
    faviconUrl: "https://static.ws.126.net/163/f2e/news/yxybd_pc/resource/static/share-icon.png",
    platformName: chrome.i18n.getMessage("platformNetease"),
    injectUrl: "https://mp.163.com/#/article-publish",
    injectFunction: ArticleNetease,
    tags: ["CN"],
    accountKey: "netease",
  },
  // experimental(待线上验证):Sohu ARTICLE DOM fallback 路径
  ARTICLE_SOHU: {
    type: "ARTICLE",
    name: "ARTICLE_SOHU",
    homeUrl: "https://mp.sohu.com/",
    faviconUrl: "https://statics.itc.cn/mp-new/icon/1.1/favicon.ico",
    platformName: chrome.i18n.getMessage("platformSohu"),
    injectUrl: "https://mp.sohu.com/mpfe/v4/contentManagement/news/addarticle",
    injectFunction: ArticleSohu,
    tags: ["CN"],
    accountKey: "sohu",
  },
  // experimental(待线上验证):Dingduanhao ARTICLE DOM 路径
  ARTICLE_DINGDUANHAO: {
    type: "ARTICLE",
    name: "ARTICLE_DINGDUANHAO",
    homeUrl: "https://mp.topnews.cn/",
    faviconUrl: "https://mp.topnews.cn/favicon.ico",
    platformName: chrome.i18n.getMessage("platformDingduanhao"),
    injectUrl: "https://mp.topnews.cn/#/scriptWrite",
    injectFunction: ArticleDingduanhao,
    tags: ["CN"],
    accountKey: "dingduanhao",
  },
  // experimental(待线上验证):Kuaichuanhao ARTICLE DOM 路径
  ARTICLE_KUAICHUANHAO: {
    type: "ARTICLE",
    name: "ARTICLE_KUAICHUANHAO",
    homeUrl: "https://kuaichuan.360kuai.com/",
    faviconUrl: "https://p0.ssl.qhimg.com/t0144491522ec4696d3.png",
    platformName: chrome.i18n.getMessage("platformKuaichuanhao"),
    injectUrl: "https://kuaichuan.360kuai.com/#/console/publish/article",
    injectFunction: ArticleKuaichuanhao,
    tags: ["CN"],
    accountKey: "kuaichuanhao",
  },
  // experimental(待线上验证):Yidianzixun ARTICLE DOM 路径
  ARTICLE_YIDIANZIXUN: {
    type: "ARTICLE",
    name: "ARTICLE_YIDIANZIXUN",
    homeUrl: "https://mp.yidianzixun.com/",
    faviconUrl: "https://www.yidianzixun.com/favicon.ico",
    platformName: chrome.i18n.getMessage("platformYidian"),
    injectUrl: "https://mp.yidianzixun.com/#/Writing/articleEditor",
    injectFunction: ArticleYidianzixun,
    tags: ["CN"],
    accountKey: "yidian",
  },
  // experimental(待线上验证):X Article DOM 路径
  ARTICLE_XARTICLE: {
    type: "ARTICLE",
    name: "ARTICLE_XARTICLE",
    homeUrl: "https://x.com/compose/articles",
    faviconUrl: "https://picx.zhimg.com/80/v2-fe30eaa8ebd8c0e49febff8c9bd0d5e4_1440w.png",
    platformName: chrome.i18n.getMessage("platformX"),
    injectUrl: "https://x.com/compose/articles",
    injectFunction: ArticleXArticle,
    tags: ["International"],
    accountKey: "x",
  },
};
