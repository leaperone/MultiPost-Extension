import type { Session } from 'electron'
import {
  sanitizeAccountStats,
  type AccountHealthStatus,
  type AccountStats,
  type PlatformType
} from '../../shared/types'
import { getDesktopRequestHeaders } from './sessionHardening'

/**
 * Session-based account user info detection.
 *
 * Instead of opening a BrowserView and scraping the DOM, we reuse the
 * account's session cookies to call each platform's own "who am I" API
 * (the same approach used by mature competitors). This works even when
 * no tab is open for the account, and gives us a stable id, the display
 * nickname and the avatar URL in one round-trip.
 */
export interface SessionUserInfo {
  username: string
  displayName?: string
  avatar?: string
  stats?: AccountStats
}

interface LoginCookieRule {
  /** Cookie name that only exists for an authenticated session */
  name: string
  /** Substring matched against the cookie's domain */
  domain: string
}

/**
 * Signature cookies that reliably indicate a real login. Platforms not in
 * this map fall back to heuristics (any cookie present), which produces
 * false positives — extend this map as platforms are verified.
 */
export const PLATFORM_LOGIN_COOKIES: Partial<Record<PlatformType, LoginCookieRule[]>> = {
  weibo: [{ name: 'SUB', domain: 'weibo.com' }],
  xiaohongshu: [{ name: 'web_session', domain: 'xiaohongshu.com' }],
  twitter: [
    { name: 'auth_token', domain: 'twitter.com' },
    { name: 'auth_token', domain: 'x.com' }
  ],
  bilibili: [{ name: 'SESSDATA', domain: 'bilibili.com' }],
  zhihu: [{ name: 'z_c0', domain: 'zhihu.com' }],
  zsxq: [{ name: 'zsxq_access_token', domain: 'zsxq.com' }],
  douyin: [
    { name: 'sessionid', domain: 'douyin.com' },
    { name: 'sessionid_ss', domain: 'douyin.com' }
  ],
  tiktok: [{ name: 'sessionid', domain: 'tiktok.com' }],
  // Rules must stay at least as broad as each platform adapter's
  // checkLoginStatus signals, or accounts get wrongly marked logged-out.
  kuaishou: [
    { name: 'passToken', domain: 'kuaishou.com' },
    { name: 'userId', domain: 'kuaishou.com' },
    { name: 'kuaishou.web.cp.api_st', domain: 'kuaishou.com' }
  ],
  toutiao: [
    { name: 'sessionid', domain: 'toutiao.com' },
    { name: 'sso_uid', domain: 'toutiao.com' }
  ],
  toutiaohao: [
    { name: 'sessionid', domain: 'toutiao.com' },
    { name: 'sso_uid', domain: 'toutiao.com' }
  ],
  juejin: [
    { name: 'sessionid', domain: 'juejin.cn' },
    { name: 'sessionid_ss', domain: 'juejin.cn' }
  ],
  wechat: [
    { name: 'slave_sid', domain: 'qq.com' },
    { name: 'slave_user', domain: 'qq.com' }
  ],
  weixinchannel: [
    { name: 'sessionid', domain: 'weixin.qq.com' },
    { name: 'uin', domain: 'qq.com' },
    { name: 'skey', domain: 'qq.com' }
  ],
  douban: [{ name: 'dbcl2', domain: 'douban.com' }],
  facebook: [{ name: 'c_user', domain: 'facebook.com' }],
  instagram: [{ name: 'sessionid', domain: 'instagram.com' }],
  linkedin: [{ name: 'li_at', domain: 'linkedin.com' }],
  jianshu: [{ name: 'remember_user_token', domain: 'jianshu.com' }],
  v2ex: [{ name: 'A2', domain: 'v2ex.com' }],
  neteasepodcast: [{ name: 'MUSIC_U', domain: '163.com' }],
  spotify: [{ name: 'sp_dc', domain: 'spotify.com' }],
  ximalaya: [{ name: '1&_token', domain: 'ximalaya.com' }]
}

export function matchesLoginCookies(
  cookies: Electron.Cookie[],
  rules: LoginCookieRule[]
): boolean {
  return rules.some((rule) =>
    cookies.some(
      (cookie) => cookie.name === rule.name && cookie.domain?.includes(rule.domain) === true
    )
  )
}

export async function buildCookieHeader(ses: Session, domain: string): Promise<string | null> {
  const cookies = await ses.cookies.get({ domain })
  if (cookies.length === 0) return null
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

export async function fetchJson(
  ses: Session,
  url: string,
  options: {
    cookieHeader: string
    referer: string
    origin?: string
    headers?: Record<string, string>
    method?: 'GET' | 'POST'
    body?: string
    contentType?: string
  }
): Promise<unknown> {
  const headers: Record<string, string> = {
    Cookie: options.cookieHeader,
    Referer: options.referer
  }
  if (options.origin) headers.Origin = options.origin
  if (options.contentType) headers['Content-Type'] = options.contentType
  if (options.headers) Object.assign(headers, options.headers)

  const response = await ses.fetch(url, {
    method: options.method ?? 'GET',
    headers: getDesktopRequestHeaders(headers),
    body: options.body
  })
  if (!response.ok) return null
  return response.json()
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickString(source: Record<string, unknown> | null, key: string): string | undefined {
  if (!source) return undefined
  const value = source[key]
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return String(value)
  return undefined
}

export function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

export function pickFiniteNumber(
  source: Record<string, unknown> | null | undefined,
  key: string
): number | undefined {
  if (!source) return undefined
  const value = source[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function firstFiniteNumber(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
): number | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = pickFiniteNumber(source, key)
      if (value !== undefined) return value
    }
  }
  return undefined
}

function sumFiniteNumbers(values: Array<number | undefined>): number | undefined {
  const finiteValues = values.filter((value): value is number => value !== undefined)
  if (finiteValues.length === 0) return undefined
  return finiteValues.reduce((total, value) => total + value, 0)
}

function buildAccountStats(metrics: Omit<AccountStats, 'updatedAt'>): AccountStats | undefined {
  const stats = sanitizeAccountStats(metrics)
  return stats ? { ...stats, updatedAt: Date.now() } : undefined
}

function logStatsFetchFailure(platform: PlatformType, error: unknown): void {
  console.warn(`[accountUserInfo] Failed to fetch stats for ${platform}:`, error)
}

const XIAOHONGSHU_PERSONAL_INFO_URL =
  'https://creator.xiaohongshu.com/api/galaxy/creator/home/personal_info'
const XIAOHONGSHU_USER_INFO_URL = 'https://creator.xiaohongshu.com/api/galaxy/user/info'
const XIAOHONGSHU_CREATOR_HOME_URL = 'https://creator.xiaohongshu.com/creator/home'
const XIAOHONGSHU_BANNED_REASON = '因违反社区规范禁止发布笔记'
const XIAOHONGSHU_RESTRICTED_REASON = '账号状态异常,可能受限'

function isPermissionValue(value: unknown): value is string | unknown[] {
  return typeof value === 'string' || Array.isArray(value)
}

function includesPermission(value: string | unknown[], permission: string): boolean {
  if (typeof value === 'string') {
    return value.includes(permission)
  }
  return value.some((item) => item === permission)
}

async function fetchXiaohongshuHealthRecord(
  ses: Session,
  url: string,
  cookieHeader: string
): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(
      await fetchJson(ses, url, {
        cookieHeader,
        referer: XIAOHONGSHU_CREATOR_HOME_URL,
        origin: 'https://creator.xiaohongshu.com',
        headers: { Authorization: '' }
      })
    )
  } catch {
    return null
  }
}

export const probeXiaohongshuHealth = async (ses: Session): Promise<AccountHealthStatus> => {
  const cookieHeader = await buildCookieHeader(ses, '.xiaohongshu.com')
  if (!cookieHeader || !cookieHeader.includes('web_session=')) {
    return { state: 'unknown' }
  }

  const personalInfo = await fetchXiaohongshuHealthRecord(
    ses,
    XIAOHONGSHU_PERSONAL_INFO_URL,
    cookieHeader
  )
  const personalData = asRecord(personalInfo?.data)
  const diagnosisStatus = pickFiniteNumber(personalData, 'diagnosis_status')
  if (diagnosisStatus === undefined) {
    return { state: 'unknown' }
  }

  if (diagnosisStatus === 2) {
    const userInfo = await fetchXiaohongshuHealthRecord(ses, XIAOHONGSHU_USER_INFO_URL, cookieHeader)
    const userData = asRecord(userInfo?.data)
    const permissions = userData?.permissions
    if (!isPermissionValue(permissions)) {
      return { state: 'restricted', reason: XIAOHONGSHU_RESTRICTED_REASON }
    }
    if (!includesPermission(permissions, 'PRODUCT_NODE')) {
      return { state: 'banned', reason: XIAOHONGSHU_BANNED_REASON }
    }
    return { state: 'restricted', reason: XIAOHONGSHU_RESTRICTED_REASON }
  }

  // Only diagnosis_status === 2 is a confirmed problem signal (the sole value
  // the competitor acts on). 0/1 are the conventional "normal" codes; any other
  // unrecognized status must NOT silently report active — fall back to unknown.
  if (diagnosisStatus === 0 || diagnosisStatus === 1) {
    return { state: 'active' }
  }
  return { state: 'unknown' }
}

type SessionUserInfoFetcher = (ses: Session) => Promise<SessionUserInfo | null>

const fetchBilibili: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.bilibili.com')
  if (!cookieHeader || !cookieHeader.includes('SESSDATA=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://api.bilibili.com/x/web-interface/nav', {
      cookieHeader,
      referer: 'https://www.bilibili.com/'
    })
  )
  const data = asRecord(json?.data)
  if (!data || data.isLogin !== true) return null

  const mid = pickString(data, 'mid')
  if (!mid) return null

  const metrics: Omit<AccountStats, 'updatedAt'> = {}
  try {
    const relationJson = asRecord(
      await fetchJson(ses, `https://api.bilibili.com/x/relation/stat?vmid=${encodeURIComponent(mid)}`, {
        cookieHeader,
        referer: 'https://www.bilibili.com/'
      })
    )
    const relationData = asRecord(relationJson?.data)
    metrics.fans = pickFiniteNumber(relationData, 'follower')
    metrics.following = pickFiniteNumber(relationData, 'following')
  } catch (error) {
    logStatsFetchFailure('bilibili', error)
  }

  try {
    const upstatJson = asRecord(
      await fetchJson(ses, `https://api.bilibili.com/x/space/upstat?mid=${encodeURIComponent(mid)}`, {
        cookieHeader,
        referer: 'https://space.bilibili.com/'
      })
    )
    const upstatData = asRecord(upstatJson?.data)
    metrics.likes = pickFiniteNumber(upstatData, 'likes')
    metrics.views = pickFiniteNumber(asRecord(upstatData?.archive), 'view')
  } catch (error) {
    logStatsFetchFailure('bilibili', error)
  }

  return {
    username: mid,
    displayName: pickString(data, 'uname'),
    avatar: pickString(data, 'face'),
    stats: buildAccountStats(metrics)
  }
}

const fetchXiaohongshu: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.xiaohongshu.com')
  if (!cookieHeader || !cookieHeader.includes('web_session=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://edith.xiaohongshu.com/api/sns/web/v2/user/me', {
      cookieHeader,
      referer: 'https://www.xiaohongshu.com/',
      origin: 'https://www.xiaohongshu.com'
    })
  )
  const data = asRecord(json?.data)
  const nickname = pickString(data, 'nickname')
  if (!nickname) return null

  return {
    username: pickString(data, 'red_id') || nickname,
    displayName: nickname,
    avatar: pickString(data, 'imageb') || pickString(data, 'images'),
    stats: buildAccountStats({
      fans: firstFiniteNumber([data], ['fans', 'fans_count', 'followers', 'follower_count']),
      following: firstFiniteNumber([data], ['follows', 'follow_count', 'following_count']),
      likes: firstFiniteNumber([data], ['liked_count', 'likes', 'likes_count']),
      works: firstFiniteNumber([data], ['note_count', 'notes_count', 'works_count']),
      views: firstFiniteNumber([data], ['view_count', 'views_count'])
    })
  }
}

const fetchDouyin: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.douyin.com')
  if (!cookieHeader || !/(?:^|;\s*)sessionid(?:_ss)?=/.test(cookieHeader)) return null

  const json = asRecord(
    await fetchJson(ses, 'https://creator.douyin.com/web/api/media/user/info/', {
      cookieHeader,
      referer: 'https://creator.douyin.com/'
    })
  )
  const user = asRecord(json?.user)
  const uid = pickString(user, 'uid') || pickString(user, 'sec_uid')
  if (!uid) return null

  const avatarSource = asRecord(user?.avatar_larger) || asRecord(user?.avatar_thumb)
  const urlList = avatarSource?.url_list
  const avatar =
    Array.isArray(urlList) && typeof urlList[0] === 'string' ? (urlList[0] as string) : undefined
  return {
    username: uid,
    displayName: pickString(user, 'nickname'),
    avatar,
    stats: buildAccountStats({
      fans: firstFiniteNumber(user ? [user] : [], [
        'follower_count',
        'followers_count',
        'fans_count'
      ]),
      following: firstFiniteNumber(user ? [user] : [], ['following_count', 'follow_count']),
      likes: firstFiniteNumber(user ? [user] : [], [
        'total_favorited',
        'favoriting_count',
        'liked_count'
      ]),
      works: firstFiniteNumber(user ? [user] : [], ['aweme_count', 'works_count', 'video_count']),
      views: firstFiniteNumber(user ? [user] : [], ['total_play_count', 'play_count'])
    })
  }
}

const fetchKuaishou: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.kuaishou.com')
  if (!cookieHeader || !cookieHeader.includes('passToken=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://www.kuaishou.com/graphql', {
      cookieHeader,
      referer: 'https://www.kuaishou.com/',
      origin: 'https://www.kuaishou.com',
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({
        operationName: 'userInfoQuery',
        variables: {},
        query:
          'query userInfoQuery {\n  userInfo {\n    id\n    name\n    avatar\n    eid\n    userId\n    __typename\n  }\n}\n'
      })
    })
  )
  const userInfo = asRecord(asRecord(json?.data)?.userInfo)
  const userId = pickString(userInfo, 'userId') || pickString(userInfo, 'id')
  if (!userId) return null

  return {
    username: userId,
    displayName: pickString(userInfo, 'name'),
    avatar: pickString(userInfo, 'avatar')
    // Stats remain undefined in P0: Kuaishou metric APIs require __NS_sig3 signing.
  }
}

const fetchZhihu: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.zhihu.com')
  if (!cookieHeader || !cookieHeader.includes('z_c0=')) return null

  const json = asRecord(
    await fetchJson(
      ses,
      'https://www.zhihu.com/api/v4/me?include=allow_message%2Cis_followed%2Cis_following%2Cfollower_count%2Canswer_count%2Carticles_count',
      {
        cookieHeader,
        referer: 'https://www.zhihu.com/'
      }
    )
  )
  const id = pickString(json, 'url_token') || pickString(json, 'id')
  const name = pickString(json, 'name')
  if (!id || !name) return null

  const answerCount = pickFiniteNumber(json, 'answer_count')
  const articlesCount = pickFiniteNumber(json, 'articles_count')
  return {
    username: id,
    displayName: name,
    avatar: pickString(json, 'avatar_url'),
    stats: buildAccountStats({
      fans: pickFiniteNumber(json, 'follower_count'),
      works: sumFiniteNumbers([answerCount, articlesCount])
    })
  }
}

const fetchJuejin: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.juejin.cn')
  if (!cookieHeader || !cookieHeader.includes('sessionid=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://api.juejin.cn/user_api/v1/user/get', {
      cookieHeader,
      referer: 'https://juejin.cn/',
      origin: 'https://juejin.cn'
    })
  )
  const data = asRecord(json?.data)
  const userId = pickString(data, 'user_id')
  if (!userId) return null

  return {
    username: userId,
    displayName: pickString(data, 'user_name'),
    avatar: pickString(data, 'avatar_large'),
    stats: buildAccountStats({
      fans: pickFiniteNumber(data, 'follower_count'),
      likes: pickFiniteNumber(data, 'got_digg_count'),
      works: pickFiniteNumber(data, 'post_article_count')
    })
  }
}

const fetchToutiao: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.toutiao.com')
  if (!cookieHeader || !cookieHeader.includes('sessionid=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://mp.toutiao.com/mp/agw/media/get_media_info', {
      cookieHeader,
      referer: 'https://mp.toutiao.com/'
    })
  )
  const data = asRecord(json?.data)
  // The payload shape differs between media and personal accounts.
  const user = asRecord(data?.user) || asRecord(data?.media)
  const id = pickString(user, 'user_id') || pickString(user, 'id') || pickString(user, 'media_id')
  const name = pickString(user, 'screen_name') || pickString(user, 'name')
  if (!id && !name) return null

  return {
    username: id || name!,
    displayName: name,
    avatar: pickString(user, 'avatar_url') || pickString(user, 'avatar'),
    stats: buildAccountStats({
      fans: firstFiniteNumber([user, data], ['fans_count', 'follower_count', 'followers_count']),
      following: firstFiniteNumber([user, data], ['follow_count', 'following_count']),
      likes: firstFiniteNumber([user, data], ['digg_count', 'like_count', 'likes_count']),
      works:
        firstFiniteNumber([user, data], ['works_count', 'content_count']) ??
        sumFiniteNumbers([
          firstFiniteNumber([user, data], ['article_count', 'all_article_count']),
          firstFiniteNumber([user, data], ['video_count'])
        ]),
      views: firstFiniteNumber([user, data], [
        'view_count',
        'total_view_count',
        'read_count',
        'total_read_count'
      ])
    })
  }
}

const fetchWeibo: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.weibo.com')
  if (!cookieHeader || !cookieHeader.includes('SUB=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://weibo.com/ajax/config', {
      cookieHeader,
      referer: 'https://weibo.com/'
    })
  )
  const data = asRecord(json?.data)
  if (data?.login !== true) return null
  const user = asRecord(data?.user)
  const uid = pickString(user, 'idstr') || pickString(user, 'id') || pickString(data, 'uid')
  if (!uid) return null

  return {
    username: uid,
    displayName: pickString(user, 'screen_name'),
    avatar: pickString(user, 'avatar_large') || pickString(user, 'profile_image_url'),
    stats: buildAccountStats({
      fans: pickFiniteNumber(user, 'followers_count'),
      following: pickFiniteNumber(user, 'friends_count'),
      works: pickFiniteNumber(user, 'statuses_count')
    })
  }
}

const fetchWeixinMp: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, 'mp.weixin.qq.com')
  if (!cookieHeader || !cookieHeader.includes('slave_sid=')) return null

  const response = await ses.fetch('https://mp.weixin.qq.com/', {
    headers: getDesktopRequestHeaders({
      Cookie: cookieHeader,
      Referer: 'https://mp.weixin.qq.com/'
    })
  })
  if (!response.ok) return null
  const html = await response.text()

  // The dashboard inlines account info into wx.commonData; quoting style varies.
  const nickname =
    html.match(/nick_name\s*:\s*"([^"]*)"/)?.[1] || html.match(/nick_name\s*:\s*'([^']*)'/)?.[1]
  const avatar =
    html.match(/head_img\s*:\s*"([^"]*)"/)?.[1] || html.match(/head_img\s*:\s*'([^']*)'/)?.[1]
  const fakeId =
    html.match(/user_name\s*:\s*"([^"]*)"/)?.[1] || html.match(/user_name\s*:\s*'([^']*)'/)?.[1]
  if (!nickname) return null

  return {
    username: fakeId || nickname,
    displayName: nickname,
    avatar: avatar?.replace(/\\x26/g, '&').replace(/&amp;/g, '&')
    // Stats remain undefined in P0: WeChat MP identity is parsed from HTML only.
  }
}

const fetchWeixinChannel: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, 'channels.weixin.qq.com')
  if (!cookieHeader || !cookieHeader.includes('sessionid=')) return null

  const json = asRecord(
    await fetchJson(
      ses,
      'https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data',
      {
        cookieHeader,
        referer: 'https://channels.weixin.qq.com/platform',
        origin: 'https://channels.weixin.qq.com',
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({})
      }
    )
  )
  const data = asRecord(json?.data)
  const finderUser = asRecord(data?.finderUser) || asRecord(data?.finderUserInfo)
  const nickname = pickString(finderUser, 'nickname')
  if (!nickname) return null

  return {
    username:
      pickString(finderUser, 'uniqId') || pickString(finderUser, 'finderUsername') || nickname,
    displayName: nickname,
    avatar: pickString(finderUser, 'headImgUrl'),
    stats: buildAccountStats({
      fans: firstFiniteNumber([finderUser, data], [
        'fansCount',
        'followerCount',
        'followersCount',
        'fans_count'
      ]),
      following: firstFiniteNumber([finderUser, data], ['followingCount', 'followCount']),
      likes: firstFiniteNumber([finderUser, data], ['likeCount', 'likedCount']),
      works: firstFiniteNumber([finderUser, data], ['feedCount', 'feedsCount', 'worksCount']),
      views: firstFiniteNumber([finderUser, data], ['viewCount', 'playCount'])
    })
  }
}

const fetchTwitter: SessionUserInfoFetcher = async (ses) => {
  // Only .x.com cookies may go to x.com: mixing in .twitter.com cookies would
  // cross the site boundary the browser itself enforces.
  const cookies = await ses.cookies.get({ domain: '.x.com' })
  if (!cookies.some((c) => c.name === 'auth_token')) return null
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

  const response = await ses.fetch('https://x.com/home', {
    headers: getDesktopRequestHeaders({ Cookie: cookieHeader, Referer: 'https://x.com/' })
  })
  if (!response.ok) return null
  const html = await response.text()
  const stateMatch = html.match(/window\.__INITIAL_STATE__=(.*?);window\.__META_DATA__=/s)
  if (!stateMatch) return null

  try {
    const state = asRecord(JSON.parse(stateMatch[1]))
    const users = asRecord(asRecord(asRecord(asRecord(state?.entities)?.users)?.entities))
    if (!users) return null
    const firstId = Object.keys(users)[0]
    const user = asRecord(users[firstId])
    if (!firstId || !user) return null

    return {
      username: pickString(user, 'screen_name') || firstId,
      displayName: pickString(user, 'name'),
      avatar: pickString(user, 'profile_image_url_https'),
      stats: buildAccountStats({
        fans: pickFiniteNumber(user, 'followers_count'),
        following: pickFiniteNumber(user, 'friends_count'),
        works: pickFiniteNumber(user, 'statuses_count')
      })
    }
  } catch {
    return null
  }
}

const SESSION_USER_INFO_FETCHERS: Partial<Record<PlatformType, SessionUserInfoFetcher>> = {
  bilibili: fetchBilibili,
  xiaohongshu: fetchXiaohongshu,
  douyin: fetchDouyin,
  kuaishou: fetchKuaishou,
  zhihu: fetchZhihu,
  juejin: fetchJuejin,
  toutiao: fetchToutiao,
  toutiaohao: fetchToutiao,
  weibo: fetchWeibo,
  wechat: fetchWeixinMp,
  weixinchannel: fetchWeixinChannel,
  twitter: fetchTwitter
}

export async function fetchSessionUserInfo(
  ses: Session,
  platform: PlatformType
): Promise<SessionUserInfo | null> {
  const fetcher = SESSION_USER_INFO_FETCHERS[platform]
  if (!fetcher) return null

  try {
    return await fetcher(ses)
  } catch (error) {
    console.error(`[accountUserInfo] Failed to fetch user info for ${platform}:`, error)
    return null
  }
}
