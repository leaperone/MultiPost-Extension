import type { Session } from 'electron'
import type { PlatformType } from '../../shared/types'
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

async function buildCookieHeader(ses: Session, domain: string): Promise<string | null> {
  const cookies = await ses.cookies.get({ domain })
  if (cookies.length === 0) return null
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

async function fetchJson(
  ses: Session,
  url: string,
  options: {
    cookieHeader: string
    referer: string
    origin?: string
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

  const response = await ses.fetch(url, {
    method: options.method ?? 'GET',
    headers: getDesktopRequestHeaders(headers),
    body: options.body
  })
  if (!response.ok) return null
  return response.json()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickString(source: Record<string, unknown> | null, key: string): string | undefined {
  if (!source) return undefined
  const value = source[key]
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number') return String(value)
  return undefined
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
  return { username: mid, displayName: pickString(data, 'uname'), avatar: pickString(data, 'face') }
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
    avatar: pickString(data, 'imageb') || pickString(data, 'images')
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
  return { username: uid, displayName: pickString(user, 'nickname'), avatar }
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
  }
}

const fetchZhihu: SessionUserInfoFetcher = async (ses) => {
  const cookieHeader = await buildCookieHeader(ses, '.zhihu.com')
  if (!cookieHeader || !cookieHeader.includes('z_c0=')) return null

  const json = asRecord(
    await fetchJson(ses, 'https://www.zhihu.com/api/v4/me', {
      cookieHeader,
      referer: 'https://www.zhihu.com/'
    })
  )
  const id = pickString(json, 'url_token') || pickString(json, 'id')
  const name = pickString(json, 'name')
  if (!id || !name) return null

  return { username: id, displayName: name, avatar: pickString(json, 'avatar_url') }
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
    avatar: pickString(data, 'avatar_large')
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
    avatar: pickString(user, 'avatar_url') || pickString(user, 'avatar')
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
    avatar: pickString(user, 'avatar_large') || pickString(user, 'profile_image_url')
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
    avatar: pickString(finderUser, 'headImgUrl')
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
      avatar: pickString(user, 'profile_image_url_https')
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
