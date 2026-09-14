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
  pinterest: {
    id: 'pinterest', name: 'Pinterest', icon: 'pinterest', iconifyIcon: 'simple-icons:pinterest',
    faviconUrl: 'https://www.pinterest.com/favicon.ico', url: 'https://www.pinterest.com',
    loginUrl: 'https://www.pinterest.com/login/', supportedContentTypes: ['DYNAMIC']
  },
  x: {
    id: 'x', name: 'X', icon: 'twitter', iconifyIcon: 'simple-icons:x', faviconUrl: 'https://x.com/favicon.ico',
    url: 'https://x.com', loginUrl: 'https://x.com/i/flow/login', supportedContentTypes: ['DYNAMIC', 'ARTICLE']
  },
  rednote: {
    id: 'rednote', name: '小红书', icon: 'xiaohongshu', iconifyIcon: 'simple-icons:xiaohongshu',
    faviconUrl: 'https://www.xiaohongshu.com/favicon.ico', url: 'https://www.xiaohongshu.com',
    loginUrl: 'https://www.xiaohongshu.com/login', supportedContentTypes: ['DYNAMIC', 'VIDEO']
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
  sohutv: {
    id: 'sohutv',
    name: '搜狐视频',
    icon: 'sohu',
    accountKey: 'sohu',
    faviconUrl: 'https://tv.sohu.com/favicon.ico',
    url: 'https://tv.sohu.com',
    loginUrl: 'https://tv.sohu.com/s/center/',
    supportedContentTypes: ['DYNAMIC', 'VIDEO']
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
  iqiyi: {
    id: 'iqiyi',
    name: '爱奇艺',
    icon: 'iqiyi',
    iconifyIcon: 'simple-icons:iqiyi',
    faviconUrl: 'https://mp.iqiyi.com/favicon.ico',
    url: 'https://mp.iqiyi.com',
    loginUrl: 'https://mp.iqiyi.com/',
    supportedContentTypes: ['VIDEO']
  },
  youku: {
    id: 'youku',
    name: '优酷',
    icon: 'youku',
    iconifyIcon: 'simple-icons:youku',
    faviconUrl: 'https://mp.youku.com/favicon.ico',
    url: 'https://mp.youku.com',
    loginUrl: 'https://mp.youku.com/',
    supportedContentTypes: ['VIDEO']
  },
  tencentvideo: {
    id: 'tencentvideo',
    name: '腾讯视频',
    icon: 'tencentvideo',
    iconifyIcon: 'simple-icons:tencentqq',
    faviconUrl: 'https://v.qq.com/favicon.ico',
    url: 'https://v.qq.com',
    loginUrl: 'https://v.qq.com/',
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
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    icon: 'medium',
    iconifyIcon: 'simple-icons:medium',
    faviconUrl: 'https://medium.com/favicon.ico',
    url: 'https://medium.com',
    loginUrl: 'https://medium.com/m/signin',
    supportedContentTypes: ['ARTICLE']
  },
  oschina: {
    id: 'oschina',
    name: '开源中国',
    icon: 'oschina',
    faviconUrl: 'https://www.oschina.net/favicon.ico',
    url: 'https://www.oschina.net',
    loginUrl: 'https://www.oschina.net/home/login',
    supportedContentTypes: ['ARTICLE']
  },
  infoq: {
    id: 'infoq',
    name: 'InfoQ',
    icon: 'infoq',
    faviconUrl: 'https://www.infoq.cn/favicon.ico',
    url: 'https://www.infoq.cn',
    loginUrl: 'https://www.infoq.cn/',
    supportedContentTypes: ['ARTICLE']
  },
  smzdm: {
    id: 'smzdm',
    name: '什么值得买',
    icon: 'smzdm',
    faviconUrl: 'https://www.smzdm.com/favicon.ico',
    url: 'https://www.smzdm.com',
    loginUrl: 'https://zhiyou.smzdm.com/user/login',
    supportedContentTypes: ['ARTICLE']
  },
  woshipm: {
    id: 'woshipm',
    name: '人人都是产品经理',
    icon: 'woshipm',
    faviconUrl: 'https://www.woshipm.com/favicon.ico',
    url: 'https://www.woshipm.com',
    loginUrl: 'https://www.woshipm.com/login',
    supportedContentTypes: ['ARTICLE']
  },
  autohome: {
    id: 'autohome',
    name: '汽车之家',
    icon: 'autohome',
    faviconUrl: 'https://www.autohome.com.cn/favicon.ico',
    url: 'https://www.autohome.com.cn',
    loginUrl: 'https://www.autohome.com.cn/',
    supportedContentTypes: ['ARTICLE']
  },
  aliyun: {
    id: 'aliyun', name: '阿里云开发者', icon: 'aliyun',
    faviconUrl: 'https://developer.aliyun.com/favicon.ico', url: 'https://developer.aliyun.com',
    loginUrl: 'https://account.aliyun.com/login/login.htm', supportedContentTypes: ['ARTICLE']
  },
  cnblogs: {
    id: 'cnblogs', name: '博客园', icon: 'cnblogs',
    faviconUrl: 'https://common.cnblogs.com/favicon.ico', url: 'https://www.cnblogs.com',
    loginUrl: 'https://account.cnblogs.com/signin', supportedContentTypes: ['ARTICLE']
  },
  dayuhao: {
    id: 'dayuhao', name: '大鱼号', icon: 'dayuhao', faviconUrl: 'https://mp.dayu.com/favicon.ico',
    url: 'https://mp.dayu.com', loginUrl: 'https://mp.dayu.com', supportedContentTypes: ['ARTICLE']
  },
  dingduanhao: {
    id: 'dingduanhao', name: '顶端号', icon: 'dingduanhao', faviconUrl: 'https://mp.topnews.cn/favicon.ico',
    url: 'https://mp.topnews.cn', loginUrl: 'https://mp.topnews.cn', supportedContentTypes: ['ARTICLE']
  },
  dongchedi: {
    id: 'dongchedi', name: '懂车帝', icon: 'dongchedi', faviconUrl: 'https://mp.dcdapp.com/favicon.ico',
    url: 'https://mp.dcdapp.com', loginUrl: 'https://mp.dcdapp.com', supportedContentTypes: ['ARTICLE']
  },
  gelonghui: {
    id: 'gelonghui', name: '格隆汇', icon: 'gelonghui', faviconUrl: 'https://www.gelonghui.com/favicon.ico',
    url: 'https://www.gelonghui.com', loginUrl: 'https://www.gelonghui.com/login', supportedContentTypes: ['ARTICLE']
  },
  jiankangjie: {
    id: 'jiankangjie', name: '健康界', icon: 'jiankangjie', faviconUrl: 'https://ucenter.cn-healthcare.com/favicon.ico',
    url: 'https://www.cn-healthcare.com', loginUrl: 'https://ucenter.cn-healthcare.com', supportedContentTypes: ['ARTICLE']
  },
  jianpian: {
    id: 'jianpian', name: '简篇', icon: 'jianpian', faviconUrl: 'https://www.jianpian.cn/favicon.ico',
    url: 'https://www.jianpian.cn', loginUrl: 'https://www.jianpian.cn', supportedContentTypes: ['ARTICLE']
  },
  kaidiwang: {
    id: 'kaidiwang', name: '凯迪网', icon: 'kaidiwang', faviconUrl: 'https://www.9kd.com/favicon.ico',
    url: 'https://www.9kd.com', loginUrl: 'https://www.9kd.com/login', supportedContentTypes: ['ARTICLE']
  },
  kuaichuanhao: {
    id: 'kuaichuanhao', name: '快传号', icon: 'kuaichuanhao', faviconUrl: 'https://kuaichuan.360kuai.com/favicon.ico',
    url: 'https://kuaichuan.360kuai.com', loginUrl: 'https://kuaichuan.360kuai.com', supportedContentTypes: ['ARTICLE']
  },
  qq: {
    id: 'qq', name: '企鹅号', icon: 'qq', faviconUrl: 'https://om.qq.com/favicon.ico',
    url: 'https://om.qq.com', loginUrl: 'https://om.qq.com', supportedContentTypes: ['ARTICLE']
  },
  tencentyun: {
    id: 'tencentyun', name: '腾讯云开发者', icon: 'tencentyun', faviconUrl: 'https://cloud.tencent.com/favicon.ico',
    url: 'https://cloud.tencent.com/developer', loginUrl: 'https://cloud.tencent.com/login', supportedContentTypes: ['ARTICLE']
  },
  tonghuashun: {
    id: 'tonghuashun', name: '同花顺', icon: 'tonghuashun', faviconUrl: 'https://t.10jqka.com.cn/circle/images/favicon.ico',
    url: 'https://t.10jqka.com.cn', loginUrl: 'https://t.10jqka.com.cn', supportedContentTypes: ['ARTICLE']
  },
  volcengine: {
    id: 'volcengine', name: '火山引擎', icon: 'volcengine', faviconUrl: 'https://developer.volcengine.com/favicon.ico',
    url: 'https://developer.volcengine.com', loginUrl: 'https://developer.volcengine.com', supportedContentTypes: ['ARTICLE']
  },
  weixin: {
    id: 'weixin', name: '微信文章', icon: 'weixin', faviconUrl: 'https://mp.weixin.qq.com/favicon.ico',
    url: 'https://mp.weixin.qq.com', loginUrl: 'https://mp.weixin.qq.com/cgi-bin/loginpage', supportedContentTypes: ['ARTICLE']
  },
  xarticle: {
    id: 'xarticle', name: 'X 文章', icon: 'x', faviconUrl: 'https://x.com/favicon.ico',
    url: 'https://x.com', loginUrl: 'https://x.com/i/flow/login', supportedContentTypes: ['ARTICLE']
  },
  yidianzixun: {
    id: 'yidianzixun', name: '一点资讯', icon: 'yidianzixun', faviconUrl: 'https://www.yidianzixun.com/favicon.ico',
    url: 'https://mp.yidianzixun.com', loginUrl: 'https://mp.yidianzixun.com', supportedContentTypes: ['ARTICLE']
  },
  qqmusic: {
    id: 'qqmusic',
    name: 'QQ音乐播客',
    icon: 'qqmusic',
    iconifyIcon: 'simple-icons:qqmusic',
    faviconUrl: 'https://mp.tencentmusic.com/favicon.ico',
    url: 'https://mp.tencentmusic.com/index',
    loginUrl: 'https://mp.tencentmusic.com/',
    supportedContentTypes: ['PODCAST']
  },
  lizhi: {
    id: 'lizhi',
    name: '荔枝播客',
    icon: 'lizhi',
    faviconUrl: 'https://nj.lizhi.fm/static/newsite/logo240.png',
    url: 'https://nj.lizhi.fm/static/newsite/#/index',
    loginUrl: 'https://nj.lizhi.fm/',
    supportedContentTypes: ['PODCAST']
  },
  ximalaya: {
    id: 'ximalaya',
    name: '喜马拉雅',
    icon: 'ximalaya',
    iconifyIcon: 'simple-icons:himalaya',
    faviconUrl: 'https://creator.ximalaya.com/favicon.ico',
    url: 'https://creator.ximalaya.com',
    loginUrl: 'https://passport.ximalaya.com/page/web/login',
    supportedContentTypes: ['PODCAST']
  },
  xiaoyuzhou: {
    id: 'xiaoyuzhou',
    name: '小宇宙',
    icon: 'xiaoyuzhou',
    faviconUrl: 'https://podcaster.xiaoyuzhoufm.com/favicon.ico',
    url: 'https://podcaster.xiaoyuzhoufm.com',
    loginUrl: 'https://podcaster.xiaoyuzhoufm.com/',
    supportedContentTypes: ['PODCAST']
  },
  qingting: {
    id: 'qingting',
    name: '蜻蜓FM',
    icon: 'qingting',
    faviconUrl: 'https://studio.qingting.fm/favicon.ico',
    url: 'https://studio.qingting.fm',
    loginUrl: 'https://studio.qingting.fm/',
    supportedContentTypes: ['PODCAST']
  },
  neteasepodcast: {
    id: 'neteasepodcast',
    name: '网易云音乐播客',
    icon: 'neteasepodcast',
    iconifyIcon: 'simple-icons:neteasecloudmusic',
    faviconUrl: 'https://podcast.music.163.com/favicon.ico',
    url: 'https://podcast.music.163.com',
    loginUrl: 'https://music.163.com/',
    supportedContentTypes: ['PODCAST']
  }
}

export const CONTENT_TYPE_LABELS: Record<SyncContentType, string> = {
  DYNAMIC: '动态',
  VIDEO: '视频',
  ARTICLE: '文章',
  PODCAST: '播客'
}
