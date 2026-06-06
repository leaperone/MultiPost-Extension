import type { PlatformType, SyncContentType } from '../../shared/types'
import { PLATFORMS } from '../../shared/constants'
import type { PlatformAdapter } from './base'
import { WeiboAdapter } from './weibo'
import { XiaohongshuAdapter } from './xiaohongshu'
import { BilibiliAdapter } from './bilibili'
import { TwitterAdapter } from './twitter'
import { DouyinAdapter } from './douyin'
import { GenericAdapter } from './generic'
// 第一批：高频中国平台适配器
import { ZhihuAdapter } from './zhihu'
import { KuaishouAdapter } from './kuaishou'
import { BaijiahaoAdapter } from './baijiahao'
import { ToutiaoAdapter } from './toutiao'
import { WeixinChannelAdapter } from './weixinchannel'
import { XueqiuAdapter } from './xueqiu'
import { OkjikeAdapter } from './okjike'
import { JuejinAdapter } from './juejin'
// 第二批：国际平台适配器
import { InstagramAdapter } from './instagram'
import { FacebookAdapter } from './facebook'
import { LinkedinAdapter } from './linkedin'
import { RedditAdapter } from './reddit'
import { ThreadsAdapter } from './threads'
import { BlueskyAdapter } from './bluesky'
import { SubstackAdapter } from './substack'
import { WebhookAdapter } from './webhook'
// 中国动态平台适配器
import { WeixinAdapter } from './weixin'
import { ToutiaohaoAdapter } from './toutiaohao'
import { V2exAdapter } from './v2ex'
import { DoubanAdapter } from './douban'
import { DedaoAdapter } from './dedao'
import { ZsxqAdapter } from './zsxq'
import { XiaoheiheAdapter } from './xiaoheihe'
import { MaimaiAdapter } from './maimai'
// 文章平台适配器
import { CsdnAdapter } from './csdn'
import { JianshuAdapter } from './jianshu'
import { SegmentfaultAdapter } from './segmentfault'
import { SspaiAdapter } from './sspai'
import { Adapter51cto } from './51cto'
import { WordpressAdapter } from './wordpress'
// 视频平台适配器
import { YoutubeAdapter } from './youtube'
import { TiktokAdapter } from './tiktok'
import { EastmoneyAdapter } from './eastmoney'
import { QieAdapter } from './qie'
import { ChejiahaoAdapter } from './chejiahao'
import { DewuAdapter } from './dewu'
import { YicheAdapter } from './yiche'
import { SohuAdapter } from './sohu'
import { NeteaseAdapter } from './netease'
import { DayuAdapter } from './dayu'
import { AlipayAdapter } from './alipay'
import { YidianAdapter } from './yidian'
import { PinduoduoAdapter } from './pinduoduo'
import { VivovideoAdapter } from './vivovideo'

// Registry of platform adapters
const adapters: Map<PlatformType, PlatformAdapter> = new Map()
const genericAdapters: Map<PlatformType, GenericAdapter> = new Map()

// Register specialized adapters (platforms with custom implementation)
adapters.set('weibo', new WeiboAdapter())
adapters.set('xiaohongshu', new XiaohongshuAdapter())
adapters.set('bilibili', new BilibiliAdapter())
adapters.set('twitter', new TwitterAdapter())
adapters.set('douyin', new DouyinAdapter())
// 第一批：高频中国平台
adapters.set('zhihu', new ZhihuAdapter())
adapters.set('kuaishou', new KuaishouAdapter())
adapters.set('baijiahao', new BaijiahaoAdapter())
adapters.set('toutiao', new ToutiaoAdapter())
adapters.set('weixinchannel', new WeixinChannelAdapter())
adapters.set('xueqiu', new XueqiuAdapter())
adapters.set('okjike', new OkjikeAdapter())
adapters.set('juejin', new JuejinAdapter())
// 第二批：国际平台
adapters.set('instagram', new InstagramAdapter())
adapters.set('facebook', new FacebookAdapter())
adapters.set('linkedin', new LinkedinAdapter())
adapters.set('reddit', new RedditAdapter())
adapters.set('threads', new ThreadsAdapter())
adapters.set('bluesky', new BlueskyAdapter())
adapters.set('substack', new SubstackAdapter())
adapters.set('webhook', new WebhookAdapter())
// 中国动态平台
adapters.set('wechat', new WeixinAdapter())
adapters.set('toutiaohao', new ToutiaohaoAdapter())
adapters.set('v2ex', new V2exAdapter())
adapters.set('douban', new DoubanAdapter())
adapters.set('dedao', new DedaoAdapter())
adapters.set('zsxq', new ZsxqAdapter())
adapters.set('xiaoheihe', new XiaoheiheAdapter())
adapters.set('maimai', new MaimaiAdapter())
// 文章平台
adapters.set('csdn', new CsdnAdapter())
adapters.set('jianshu', new JianshuAdapter())
adapters.set('segmentfault', new SegmentfaultAdapter())
adapters.set('sspai', new SspaiAdapter())
adapters.set('51cto', new Adapter51cto())
adapters.set('wordpress', new WordpressAdapter())
// 视频平台
adapters.set('youtube', new YoutubeAdapter())
adapters.set('tiktok', new TiktokAdapter())
adapters.set('eastmoney', new EastmoneyAdapter())
adapters.set('qie', new QieAdapter())
adapters.set('chejiahao', new ChejiahaoAdapter())
adapters.set('dewu', new DewuAdapter())
adapters.set('yiche', new YicheAdapter())
adapters.set('sohu', new SohuAdapter())
adapters.set('netease', new NeteaseAdapter())
adapters.set('dayu', new DayuAdapter())
adapters.set('alipay', new AlipayAdapter())
adapters.set('yidian', new YidianAdapter())
adapters.set('pinduoduo', new PinduoduoAdapter())
adapters.set('vivovideo', new VivovideoAdapter())

const genericPlatforms = (Object.keys(PLATFORMS) as PlatformType[]).filter(
  (platform) => !adapters.has(platform)
)

// Register generic adapters for all other platforms
for (const platform of genericPlatforms) {
  if (PLATFORMS[platform]) {
    const adapter = new GenericAdapter(platform)
    adapters.set(platform, adapter)
    genericAdapters.set(platform, adapter)
  }
}

function getGenericAdapter(platform: PlatformType): GenericAdapter | undefined {
  if (!PLATFORMS[platform]) return undefined

  let adapter = genericAdapters.get(platform)
  if (!adapter) {
    adapter = new GenericAdapter(platform)
    genericAdapters.set(platform, adapter)
  }
  return adapter
}

/**
 * Get adapter for a specific platform
 */
export function getAdapter(
  platform: PlatformType,
  contentType?: SyncContentType
): PlatformAdapter | undefined {
  const adapter = adapters.get(platform)
  if (
    contentType &&
    adapter &&
    !adapter.supportedContentTypes.includes(contentType) &&
    PLATFORMS[platform]?.supportedContentTypes.includes(contentType)
  ) {
    return getGenericAdapter(platform)
  }

  return adapter
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): Map<PlatformType, PlatformAdapter> {
  return adapters
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: PlatformType): boolean {
  return adapters.has(platform)
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): PlatformType[] {
  return Array.from(adapters.keys())
}

export { type PlatformAdapter } from './base'
export { WeiboAdapter } from './weibo'
export { XiaohongshuAdapter } from './xiaohongshu'
export { BilibiliAdapter } from './bilibili'
export { TwitterAdapter } from './twitter'
export { DouyinAdapter } from './douyin'
export { GenericAdapter, createGenericAdapter } from './generic'
// 第一批：高频中国平台适配器
export { ZhihuAdapter } from './zhihu'
export { KuaishouAdapter } from './kuaishou'
export { BaijiahaoAdapter } from './baijiahao'
export { ToutiaoAdapter } from './toutiao'
export { WeixinChannelAdapter } from './weixinchannel'
export { XueqiuAdapter } from './xueqiu'
export { OkjikeAdapter } from './okjike'
export { JuejinAdapter } from './juejin'
// 第二批：国际平台适配器
export { InstagramAdapter } from './instagram'
export { FacebookAdapter } from './facebook'
export { LinkedinAdapter } from './linkedin'
export { RedditAdapter } from './reddit'
export { ThreadsAdapter } from './threads'
export { BlueskyAdapter } from './bluesky'
export { SubstackAdapter } from './substack'
export { WebhookAdapter } from './webhook'
// 中国动态平台适配器
export { WeixinAdapter } from './weixin'
export { ToutiaohaoAdapter } from './toutiaohao'
export { V2exAdapter } from './v2ex'
export { DoubanAdapter } from './douban'
export { DedaoAdapter } from './dedao'
export { ZsxqAdapter } from './zsxq'
export { XiaoheiheAdapter } from './xiaoheihe'
export { MaimaiAdapter } from './maimai'
// 文章平台适配器
export { CsdnAdapter } from './csdn'
export { JianshuAdapter } from './jianshu'
export { SegmentfaultAdapter } from './segmentfault'
export { SspaiAdapter } from './sspai'
export { Adapter51cto } from './51cto'
export { WordpressAdapter } from './wordpress'
// 视频平台适配器
export { YoutubeAdapter } from './youtube'
export { TiktokAdapter } from './tiktok'
export { EastmoneyAdapter } from './eastmoney'
export { QieAdapter } from './qie'
export { ChejiahaoAdapter } from './chejiahao'
export { DewuAdapter } from './dewu'
export { YicheAdapter } from './yiche'
export { SohuAdapter } from './sohu'
export { NeteaseAdapter } from './netease'
export { DayuAdapter } from './dayu'
export { AlipayAdapter } from './alipay'
export { YidianAdapter } from './yidian'
export { PinduoduoAdapter } from './pinduoduo'
export { VivovideoAdapter } from './vivovideo'
