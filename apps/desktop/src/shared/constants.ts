import type { PlatformInfo, SyncContentType } from './types'

export const PLATFORMS: Record<string, PlatformInfo> = {
  // ========== 已实现的平台 ==========
  weibo: {
    id: 'weibo',
    name: '微博',
    icon: 'weibo',
    iconifyIcon: 'simple-icons:sinaweibo',
    faviconUrl: 'https://weibo.com/favicon.ico',
    url: 'https://weibo.com',
    loginUrl: 'https://passport.weibo.com/sso/signin',
    supportedContentTypes: ['DYNAMIC', 'VIDEO', 'ARTICLE']
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: 'xiaohongshu',
    iconifyIcon: 'simple-icons:xiaohongshu',
    faviconUrl: 'https://www.xiaohongshu.com/favicon.ico',
    url: 'https://www.xiaohongshu.com',
    loginUrl: 'https://www.xiaohongshu.com/login',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    icon: 'twitter',
    iconifyIcon: 'simple-icons:x',
    faviconUrl: 'https://abs.twimg.com/favicons/twitter.3.ico',
    url: 'https://x.com',
    loginUrl: 'https://x.com/i/flow/login',
    supportedContentTypes: ['DYNAMIC']
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: 'douyin',
    iconifyIcon: 'simple-icons:tiktok',
    faviconUrl: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
    url: 'https://creator.douyin.com',
    loginUrl: 'https://creator.douyin.com/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  bilibili: {
    id: 'bilibili',
    name: 'B站',
    icon: 'bilibili',
    iconifyIcon: 'simple-icons:bilibili',
    faviconUrl: 'https://static.hdslb.com/images/favicon.ico',
    url: 'https://www.bilibili.com',
    loginUrl: 'https://passport.bilibili.com/login',
    supportedContentTypes: ['DYNAMIC', 'VIDEO', 'ARTICLE']
  },
  // TODO: 知乎反爬虫问题，暂时禁用，后续解决后再启用
  // zhihu: {
  //   id: 'zhihu',
  //   name: '知乎',
  //   icon: 'zhihu',
  //   iconifyIcon: 'simple-icons:zhihu',
  //   faviconUrl: 'https://static.zhihu.com/heifetz/favicon.ico',
  //   url: 'https://www.zhihu.com',
  //   loginUrl: 'https://www.zhihu.com/signin',
  //   supportedContentTypes: ['DYNAMIC', 'VIDEO', 'ARTICLE']
  // },
  wechat: {
    id: 'wechat',
    name: '微信公众号',
    icon: 'wechat',
    iconifyIcon: 'simple-icons:wechat',
    faviconUrl: 'https://mp.weixin.qq.com/favicon.ico',
    url: 'https://mp.weixin.qq.com',
    loginUrl: 'https://mp.weixin.qq.com/cgi-bin/loginpage',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },

  // ========== 中国动态平台 ==========
  xueqiu: {
    id: 'xueqiu',
    name: '雪球',
    icon: 'xueqiu',
    faviconUrl: 'https://xueqiu.com/favicon.ico',
    url: 'https://xueqiu.com',
    loginUrl: 'https://xueqiu.com/',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },
  okjike: {
    id: 'okjike',
    name: '即刻',
    icon: 'okjike',
    faviconUrl: 'https://web.okjike.com/favicon.ico',
    url: 'https://web.okjike.com',
    loginUrl: 'https://web.okjike.com',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  kuaishou: {
    id: 'kuaishou',
    name: '快手',
    icon: 'kuaishou',
    iconifyIcon: 'simple-icons:kuaishou',
    faviconUrl: 'https://cp.kuaishou.com/favicon.ico',
    url: 'https://cp.kuaishou.com',
    loginUrl: 'https://cp.kuaishou.com/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  baijiahao: {
    id: 'baijiahao',
    name: '百家号',
    icon: 'baijiahao',
    iconifyIcon: 'simple-icons:baidu',
    faviconUrl: 'https://baijiahao.baidu.com/favicon.ico',
    url: 'https://baijiahao.baidu.com',
    loginUrl: 'https://baijiahao.baidu.com/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO', 'ARTICLE']
  },
  toutiao: {
    id: 'toutiao',
    name: '头条',
    icon: 'toutiao',
    faviconUrl: 'https://mp.toutiao.com/favicon.ico',
    url: 'https://mp.toutiao.com',
    loginUrl: 'https://mp.toutiao.com/',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },
  toutiaohao: {
    id: 'toutiaohao',
    name: '头条号',
    icon: 'toutiaohao',
    faviconUrl: 'https://mp.toutiao.com/favicon.ico',
    url: 'https://mp.toutiao.com',
    loginUrl: 'https://mp.toutiao.com/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  weixinchannel: {
    id: 'weixinchannel',
    name: '微信视频号',
    icon: 'weixinchannel',
    iconifyIcon: 'simple-icons:wechat',
    faviconUrl: 'https://channels.weixin.qq.com/favicon.ico',
    url: 'https://channels.weixin.qq.com',
    loginUrl: 'https://channels.weixin.qq.com/platform',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  v2ex: {
    id: 'v2ex',
    name: 'V2EX',
    icon: 'v2ex',
    iconifyIcon: 'simple-icons:v2ex',
    faviconUrl: 'https://www.v2ex.com/favicon.ico',
    url: 'https://www.v2ex.com',
    loginUrl: 'https://www.v2ex.com/signin',
    supportedContentTypes: ['DYNAMIC']
  },
  douban: {
    id: 'douban',
    name: '豆瓣',
    icon: 'douban',
    iconifyIcon: 'simple-icons:douban',
    faviconUrl: 'https://www.douban.com/favicon.ico',
    url: 'https://www.douban.com',
    loginUrl: 'https://www.douban.com/accounts/login',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },
  dedao: {
    id: 'dedao',
    name: '得到',
    icon: 'dedao',
    faviconUrl: 'https://www.dedao.cn/favicon.ico',
    url: 'https://www.dedao.cn',
    loginUrl: 'https://www.dedao.cn/',
    supportedContentTypes: ['DYNAMIC']
  },
  zsxq: {
    id: 'zsxq',
    name: '知识星球',
    icon: 'zsxq',
    faviconUrl: 'https://wx.zsxq.com/favicon.ico',
    url: 'https://wx.zsxq.com',
    loginUrl: 'https://wx.zsxq.com/',
    supportedContentTypes: ['DYNAMIC']
  },
  xiaoheihe: {
    id: 'xiaoheihe',
    name: '小黑盒',
    icon: 'xiaoheihe',
    faviconUrl: 'https://www.xiaoheihe.cn/favicon.ico',
    url: 'https://www.xiaoheihe.cn',
    loginUrl: 'https://www.xiaoheihe.cn/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  maimai: {
    id: 'maimai',
    name: '脉脉',
    icon: 'maimai',
    faviconUrl: 'https://maimai.cn/favicon.ico',
    url: 'https://maimai.cn',
    loginUrl: 'https://maimai.cn/',
    supportedContentTypes: ['DYNAMIC']
  },
  juejin: {
    id: 'juejin',
    name: '掘金',
    icon: 'juejin',
    iconifyIcon: 'simple-icons:juejin',
    faviconUrl: 'https://juejin.cn/favicon.ico',
    url: 'https://juejin.cn',
    loginUrl: 'https://juejin.cn/login',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },

  // ========== 国际动态平台 ==========
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    iconifyIcon: 'simple-icons:instagram',
    faviconUrl: 'https://www.instagram.com/favicon.ico',
    url: 'https://www.instagram.com',
    loginUrl: 'https://www.instagram.com/accounts/login/',
    supportedContentTypes: ['DYNAMIC']
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    iconifyIcon: 'simple-icons:facebook',
    faviconUrl: 'https://www.facebook.com/favicon.ico',
    url: 'https://www.facebook.com',
    loginUrl: 'https://www.facebook.com/login/',
    supportedContentTypes: ['DYNAMIC']
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    iconifyIcon: 'simple-icons:linkedin',
    faviconUrl: 'https://www.linkedin.com/favicon.ico',
    url: 'https://www.linkedin.com',
    loginUrl: 'https://www.linkedin.com/login',
    supportedContentTypes: ['DYNAMIC']
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    iconifyIcon: 'simple-icons:reddit',
    faviconUrl: 'https://www.reddit.com/favicon.ico',
    url: 'https://www.reddit.com',
    loginUrl: 'https://www.reddit.com/login/',
    supportedContentTypes: ['DYNAMIC']
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    icon: 'threads',
    iconifyIcon: 'simple-icons:threads',
    faviconUrl: 'https://www.threads.net/favicon.ico',
    url: 'https://www.threads.net',
    loginUrl: 'https://www.threads.net/login/',
    supportedContentTypes: ['DYNAMIC']
  },
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    icon: 'bluesky',
    iconifyIcon: 'simple-icons:bluesky',
    faviconUrl: 'https://bsky.app/favicon.ico',
    url: 'https://bsky.app',
    loginUrl: 'https://bsky.app/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
  },
  substack: {
    id: 'substack',
    name: 'Substack',
    icon: 'substack',
    iconifyIcon: 'simple-icons:substack',
    faviconUrl: 'https://substack.com/favicon.ico',
    url: 'https://substack.com',
    loginUrl: 'https://substack.com/sign-in',
    supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },
  webhook: {
    id: 'webhook',
    name: 'Webhook',
    icon: 'webhook',
    iconifyIcon: 'mdi:webhook',
    url: 'https://multipost.app',
    loginUrl: 'https://multipost.app/',
    supportedContentTypes: ['DYNAMIC']
  },

  // ========== 视频平台 ==========
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    iconifyIcon: 'simple-icons:youtube',
    faviconUrl: 'https://www.youtube.com/favicon.ico',
    url: 'https://studio.youtube.com',
    loginUrl: 'https://accounts.google.com/',
    supportedContentTypes: ['VIDEO']
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    iconifyIcon: 'simple-icons:tiktok',
    faviconUrl: 'https://www.tiktok.com/favicon.ico',
    url: 'https://www.tiktok.com/tiktokstudio',
    loginUrl: 'https://www.tiktok.com/login',
    supportedContentTypes: ['VIDEO']
  },
  eastmoney: {
    id: 'eastmoney',
    name: '东方财富',
    icon: 'eastmoney',
    url: 'https://www.eastmoney.com',
    loginUrl: 'https://passport2.eastmoney.com/',
    supportedContentTypes: ['VIDEO', 'ARTICLE']
  },
  qie: {
    id: 'qie',
    name: '企鹅号',
    icon: 'qie',
    url: 'https://om.qq.com',
    loginUrl: 'https://om.qq.com/',
    supportedContentTypes: ['VIDEO']
  },
  chejiahao: {
    id: 'chejiahao',
    name: '车家号',
    icon: 'chejiahao',
    url: 'https://creator.autohome.com.cn',
    loginUrl: 'https://creator.autohome.com.cn/',
    supportedContentTypes: ['VIDEO']
  },
  dewu: {
    id: 'dewu',
    name: '得物',
    icon: 'dewu',
    url: 'https://creator.dewu.com',
    loginUrl: 'https://creator.dewu.com/',
    supportedContentTypes: ['VIDEO']
  },
  yiche: {
    id: 'yiche',
    name: '易车',
    icon: 'yiche',
    url: 'https://mp.yiche.com',
    loginUrl: 'https://mp.yiche.com/',
    supportedContentTypes: ['VIDEO']
  },
  sohu: {
    id: 'sohu',
    name: '搜狐',
    icon: 'sohu',
    url: 'https://mp.sohu.com',
    loginUrl: 'https://mp.sohu.com/',
    supportedContentTypes: ['VIDEO']
  },
  netease: {
    id: 'netease',
    name: '网易',
    icon: 'netease',
    url: 'http://mp.163.com',
    loginUrl: 'http://mp.163.com/',
    supportedContentTypes: ['VIDEO']
  },
  dayu: {
    id: 'dayu',
    name: '大鱼号',
    icon: 'dayu',
    url: 'https://mp.dayu.com',
    loginUrl: 'https://mp.dayu.com/',
    supportedContentTypes: ['VIDEO']
  },
  alipay: {
    id: 'alipay',
    name: '支付宝',
    icon: 'alipay',
    url: 'https://sweb.alipay.com',
    loginUrl: 'https://auth.alipay.com/',
    supportedContentTypes: ['VIDEO']
  },
  yidian: {
    id: 'yidian',
    name: '一点号',
    icon: 'yidian',
    url: 'https://mp.yidianzixun.com',
    loginUrl: 'https://mp.yidianzixun.com/',
    supportedContentTypes: ['VIDEO']
  },
  pinduoduo: {
    id: 'pinduoduo',
    name: '拼多多',
    icon: 'pinduoduo',
    url: 'https://live.pinduoduo.com',
    loginUrl: 'https://live.pinduoduo.com/',
    supportedContentTypes: ['VIDEO']
  },
  vivovideo: {
    id: 'vivovideo',
    name: 'vivo视频',
    icon: 'vivovideo',
    url: 'https://kaixinkan.vivo.com.cn',
    loginUrl: 'https://kaixinkan.vivo.com.cn/',
    supportedContentTypes: ['VIDEO']
  },

  // ========== 文章平台 ==========
  csdn: {
    id: 'csdn',
    name: 'CSDN',
    icon: 'csdn',
    url: 'https://mp.csdn.net',
    loginUrl: 'https://passport.csdn.net/login',
    supportedContentTypes: ['ARTICLE']
  },
  jianshu: {
    id: 'jianshu',
    name: '简书',
    icon: 'jianshu',
    url: 'https://www.jianshu.com',
    loginUrl: 'https://www.jianshu.com/sign_in',
    supportedContentTypes: ['ARTICLE']
  },
  segmentfault: {
    id: 'segmentfault',
    name: '思否',
    icon: 'segmentfault',
    url: 'https://segmentfault.com',
    loginUrl: 'https://segmentfault.com/user/login',
    supportedContentTypes: ['ARTICLE']
  },
  sspai: {
    id: 'sspai',
    name: '少数派',
    icon: 'sspai',
    url: 'https://sspai.com',
    loginUrl: 'https://sspai.com/login',
    supportedContentTypes: ['ARTICLE']
  },
  '51cto': {
    id: '51cto',
    name: '51CTO',
    icon: '51cto',
    url: 'https://blog.51cto.com',
    loginUrl: 'https://home.51cto.com/login',
    supportedContentTypes: ['ARTICLE']
  },
  wordpress: {
    id: 'wordpress',
    name: 'WordPress',
    icon: 'wordpress',
    url: 'https://wordpress.com',
    loginUrl: 'https://wordpress.com/log-in',
    supportedContentTypes: ['ARTICLE']
  }
}

// Content type labels for UI display
export const CONTENT_TYPE_LABELS: Record<SyncContentType, string> = {
  DYNAMIC: '动态',
  VIDEO: '视频',
  ARTICLE: '文章',
  PODCAST: '播客'
}

// Platform publish URLs for each content type
export const PLATFORM_PUBLISH_URLS: Record<string, Partial<Record<SyncContentType, string>>> = {
  // ========== 已实现的平台 ==========
  weibo: {
    DYNAMIC: 'https://weibo.com',
    VIDEO: 'https://weibo.com/upload/channel',
    ARTICLE: 'https://card.weibo.com/article/v3/editor'
  },
  xiaohongshu: {
    DYNAMIC: 'https://creator.xiaohongshu.com/publish/publish?target=image',
    VIDEO: 'https://creator.xiaohongshu.com/publish/publish?target=video'
  },
  twitter: {
    DYNAMIC: 'https://x.com/home'
  },
  douyin: {
    DYNAMIC: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
    VIDEO: 'https://creator.douyin.com/creator-micro/content/upload'
  },
  bilibili: {
    DYNAMIC: 'https://t.bilibili.com/',
    VIDEO: 'https://member.bilibili.com/platform/upload/video/frame',
    ARTICLE: 'https://member.bilibili.com/article-text/home?newEditor=-1'
  },
  // TODO: 知乎反爬虫问题，暂时禁用
  // zhihu: {
  //   DYNAMIC: 'https://www.zhihu.com/',
  //   VIDEO: 'https://www.zhihu.com/zvideo/upload-video',
  //   ARTICLE: 'https://zhuanlan.zhihu.com/write'
  // },
  wechat: {
    DYNAMIC: 'https://mp.weixin.qq.com/',
    ARTICLE: 'https://mp.weixin.qq.com/'
  },

  // ========== 中国动态平台 ==========
  xueqiu: {
    DYNAMIC: 'https://xueqiu.com',
    ARTICLE: 'https://mp.xueqiu.com/writeV2?position=pc_home_primary'
  },
  okjike: {
    DYNAMIC: 'https://web.okjike.com',
    VIDEO: 'https://web.okjike.com'
  },
  kuaishou: {
    DYNAMIC: 'https://cp.kuaishou.com/article/publish/video',
    VIDEO: 'https://cp.kuaishou.com/article/publish/video'
  },
  baijiahao: {
    DYNAMIC: 'https://baijiahao.baidu.com/builder/rc/edit?type=events',
    VIDEO: 'https://baijiahao.baidu.com/builder/rc/edit?type=videoV2',
    ARTICLE: 'https://baijiahao.baidu.com/builder/rc/edit?type=news'
  },
  toutiao: {
    DYNAMIC: 'https://mp.toutiao.com/profile_v4/weitoutiao/publish',
    ARTICLE: 'https://mp.toutiao.com/profile_v4/graphic/publish'
  },
  toutiaohao: {
    DYNAMIC: 'https://mp.toutiao.com/profile_v4/weitoutiao/publish',
    VIDEO: 'https://mp.toutiao.com/profile_v4/xigua/upload-video'
  },
  weixinchannel: {
    DYNAMIC: 'https://channels.weixin.qq.com/platform/post/finderNewLifeCreate',
    VIDEO: 'https://channels.weixin.qq.com/platform/post/create'
  },
  v2ex: {
    DYNAMIC: 'https://www.v2ex.com/write'
  },
  douban: {
    DYNAMIC: 'https://www.douban.com/',
    ARTICLE: 'https://www.douban.com/note/create'
  },
  dedao: {
    DYNAMIC: 'https://www.dedao.cn/knowledge/home'
  },
  zsxq: {
    DYNAMIC: 'https://wx.zsxq.com/'
  },
  xiaoheihe: {
    DYNAMIC: 'https://www.xiaoheihe.cn/creator/editor/draft/image_text',
    VIDEO: 'https://www.xiaoheihe.cn/creator/editor/draft/video'
  },
  maimai: {
    DYNAMIC: 'https://maimai.cn/community/home/following'
  },
  juejin: {
    DYNAMIC: 'https://juejin.cn/pins',
    ARTICLE: 'https://juejin.cn/editor/drafts/new?v=2'
  },

  // ========== 国际动态平台 ==========
  instagram: {
    DYNAMIC: 'https://www.instagram.com/'
  },
  facebook: {
    DYNAMIC: 'https://www.facebook.com/'
  },
  linkedin: {
    DYNAMIC: 'https://www.linkedin.com/feed'
  },
  reddit: {
    DYNAMIC: 'https://www.reddit.com/submit?type=IMAGE'
  },
  threads: {
    DYNAMIC: 'https://www.threads.net/web'
  },
  bluesky: {
    DYNAMIC: 'https://bsky.app/',
    VIDEO: 'https://bsky.app/'
  },
  substack: {
    DYNAMIC: 'https://substack.com/home',
    ARTICLE: 'https://substack.com/publish/post'
  },
  webhook: {
    DYNAMIC: 'https://multipost.app/about/'
  },

  // ========== 视频平台 ==========
  youtube: {
    VIDEO: 'https://studio.youtube.com/'
  },
  tiktok: {
    VIDEO: 'https://www.tiktok.com/tiktokstudio/upload'
  },
  eastmoney: {
    VIDEO: 'https://mp.eastmoney.com/collect/pc_writer/index.html#/publish/video',
    ARTICLE: 'https://mp.eastmoney.com/collect/pc_article/index.html'
  },
  qie: {
    VIDEO: 'https://om.qq.com/main/creation/video'
  },
  chejiahao: {
    VIDEO: 'https://creator.autohome.com.cn/web/publish/video'
  },
  dewu: {
    VIDEO: 'https://creator.dewu.com/release'
  },
  yiche: {
    VIDEO: 'https://mp.yiche.com/videos/video'
  },
  sohu: {
    VIDEO: 'https://mp.sohu.com/mpfe/v4/contentManagement/news/addvideo'
  },
  netease: {
    VIDEO: 'http://mp.163.com/subscribe_v4/index.html#/home'
  },
  dayu: {
    VIDEO: 'https://mp.dayu.com/dashboard/video/write'
  },
  alipay: {
    VIDEO: 'https://c.alipay.com/page/content-creation/publish/short-video'
  },
  yidian: {
    VIDEO: 'https://mp.yidianzixun.com/'
  },
  pinduoduo: {
    VIDEO: 'https://live.pinduoduo.com/creator/live-record'
  },
  vivovideo: {
    VIDEO: 'https://kaixinkan.vivo.com.cn/#/home'
  },

  // ========== 文章平台 ==========
  csdn: {
    ARTICLE: 'https://mp.csdn.net/mp_blog/creation/editor'
  },
  jianshu: {
    ARTICLE: 'https://www.jianshu.com/writer'
  },
  segmentfault: {
    ARTICLE: 'https://segmentfault.com/write'
  },
  sspai: {
    ARTICLE: 'https://sspai.com/write'
  },
  '51cto': {
    ARTICLE: 'https://blog.51cto.com/blogger/publish?old=1'
  },
  wordpress: {
    ARTICLE: 'https://wordpress.com/wp-admin/new-post.php'
  }
}

export const IPC_CHANNELS = {
  // Account Group
  GROUP_LIST: 'group:list',
  GROUP_GET: 'group:get',
  GROUP_CREATE: 'group:create',
  GROUP_DELETE: 'group:delete',
  GROUP_UPDATE: 'group:update',

  // Account
  ACCOUNT_LIST: 'account:list',
  ACCOUNT_GET: 'account:get',
  ACCOUNT_CREATE: 'account:create',
  ACCOUNT_DELETE: 'account:delete',
  ACCOUNT_UPDATE: 'account:update',
  ACCOUNT_SET_DEFAULT: 'account:setDefault',

  // Browser
  BROWSER_OPEN: 'browser:open',
  BROWSER_CLOSE: 'browser:close',
  BROWSER_SHOW: 'browser:show',
  BROWSER_HIDE: 'browser:hide',
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_EXECUTE: 'browser:execute',
  BROWSER_GET_LOGIN_STATUS: 'browser:getLoginStatus',

  // Browser Tabs
  BROWSER_TAB_LIST: 'browser:tabList',
  BROWSER_TAB_SWITCH: 'browser:tabSwitch',
  BROWSER_TAB_SWITCH_HOME: 'browser:tabSwitchHome',
  BROWSER_TAB_CLOSE: 'browser:tabClose',
  BROWSER_TAB_GO_BACK: 'browser:tabGoBack',
  BROWSER_TAB_GO_FORWARD: 'browser:tabGoForward',
  BROWSER_TAB_REFRESH: 'browser:tabRefresh',

  // Publish
  PUBLISH_EXECUTE: 'publish:execute',
  PUBLISH_CANCEL: 'publish:cancel',
  PUBLISH_START: 'publish:start',
  PUBLISH_START_IN_EXECUTOR: 'publish:startInExecutor',

  // Platform browser (simple mode)
  PLATFORM_OPEN: 'platform:open',
  PLATFORM_SWITCH: 'platform:switch',
  PLATFORM_CLOSE: 'platform:close',
  PLATFORM_HIDE: 'platform:hide',
  PLATFORM_HIDE_ALL: 'platform:hideAll',
  PLATFORM_CLOSE_ALL: 'platform:closeAll',
  PLATFORM_LIST: 'platform:list',
  PLATFORM_BACK: 'platform:back',
  PLATFORM_FORWARD: 'platform:forward',
  PLATFORM_REFRESH: 'platform:refresh',

  // Executor browser (independent from publish)
  EXECUTOR_OPEN: 'executor:open',
  EXECUTOR_OPEN_DEFAULT: 'executor:openDefault', // Open with default persistent session
  EXECUTOR_SHOW: 'executor:show',
  EXECUTOR_HIDE: 'executor:hide',
  EXECUTOR_HIDE_ALL: 'executor:hideAll',
  EXECUTOR_CLOSE: 'executor:close',
  EXECUTOR_LIST: 'executor:list',

  // Task
  TASK_CREATE: 'task:create',
  TASK_LIST: 'task:list',
  TASK_GET: 'task:get',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',

  // Draft
  DRAFT_LIST: 'draft:list',
  DRAFT_GET: 'draft:get',
  DRAFT_CREATE: 'draft:create',
  DRAFT_UPDATE: 'draft:update',
  DRAFT_DELETE: 'draft:delete',

  // Publish History
  HISTORY_LIST: 'history:list',
  HISTORY_GET: 'history:get',
  HISTORY_CREATE: 'history:create',
  HISTORY_UPDATE: 'history:update',
  HISTORY_DELETE: 'history:delete',

  // Scheduled Publish
  SCHEDULED_LIST: 'scheduled:list',
  SCHEDULED_GET: 'scheduled:get',
  SCHEDULED_CREATE: 'scheduled:create',
  SCHEDULED_UPDATE: 'scheduled:update',
  SCHEDULED_DELETE: 'scheduled:delete',
  SCHEDULED_CANCEL: 'scheduled:cancel',

  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PLATFORMS: 'app:getPlatforms',
  APP_READ_FILE_AS_DATA_URL: 'app:readFileAsDataURL',
  APP_GET_FILE_INFO: 'app:getFileInfo',
  APP_SELECT_FILE: 'app:selectFile',

  // Layout
  LAYOUT_SET_SIDEBAR_WIDTH: 'layout:setSidebarWidth',

  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_GET_STATUS: 'updater:getStatus',
  UPDATER_STATUS: 'updater:status',

  // Publish Group
  PUBLISH_GROUP_CREATE: 'publishGroup:create',
  PUBLISH_GROUP_SHOW: 'publishGroup:show',
  PUBLISH_GROUP_SWITCH_TAB: 'publishGroup:switchTab',
  PUBLISH_GROUP_CLOSE_TAB: 'publishGroup:closeTab',
  PUBLISH_GROUP_CLOSE: 'publishGroup:close',
  PUBLISH_GROUP_GET_TABS: 'publishGroup:getTabs',
  PUBLISH_GROUP_GET: 'publishGroup:get',
  PUBLISH_GROUP_LIST: 'publishGroup:list',
  PUBLISH_GROUP_FILL: 'publishGroup:fill',
  PUBLISH_GROUP_SUBMIT_ONE: 'publishGroup:submitOne',
  PUBLISH_GROUP_SUBMIT_ALL: 'publishGroup:submitAll',
  PUBLISH_GROUP_UPDATE_STATUS: 'publishGroup:updateStatus',

  // KeepAlive
  KEEPALIVE_GET_STATUS: 'keepAlive:getStatus',
  KEEPALIVE_TRIGGER: 'keepAlive:trigger'
} as const
