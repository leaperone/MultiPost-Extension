import type { PlatformInfo, SyncContentType } from './types'

export const PLATFORMS: Record<string, PlatformInfo> = {
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

export const CONTENT_TYPE_LABELS: Record<SyncContentType, string> = {
  DYNAMIC: '动态',
  VIDEO: '视频',
  ARTICLE: '文章',
  PODCAST: '播客'
}
