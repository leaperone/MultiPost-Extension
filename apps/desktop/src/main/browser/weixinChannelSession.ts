import type { Session } from 'electron'
import {
  asRecord,
  buildCookieHeader,
  fetchJson,
  stringValue
} from './accountUserInfo'

const WEIXIN_CHANNEL_ORIGIN = 'https://channels.weixin.qq.com'
const WEIXIN_CHANNEL_AUTH_DATA_URL =
  'https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data'
const WEIXIN_CHANNEL_PLATFORM_REFERER = 'https://channels.weixin.qq.com/platform'

export interface WeixinChannelContext {
  cookieHeader: string
  finderId: string
  finderUser: Record<string, unknown>
}

interface WeixinChannelPostOptions {
  referer?: string
  headers?: Record<string, string>
  logLabel?: string
}

function getDataRecord(json: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(json?.data) || json
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = stringValue(value)
    if (text) return text
  }
  return undefined
}

export function buildWeixinInteractionBody(
  finderId: string,
  body: Record<string, unknown> = {}
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    timestamp: Date.now(),
    _log_finder_uin: '',
    rawKeyBuff: null,
    pluginSessionId: null,
    scene: 7,
    reqScene: 7
  }

  return {
    ...defaults,
    ...body,
    _log_finder_id: finderId
  }
}

export async function getWeixinChannelContext(
  ses: Session
): Promise<WeixinChannelContext | null> {
  try {
    const cookieHeader = await buildCookieHeader(ses, 'channels.weixin.qq.com')
    if (!cookieHeader || !cookieHeader.includes('sessionid=')) return null

    const authData = asRecord(
      await fetchJson(ses, WEIXIN_CHANNEL_AUTH_DATA_URL, {
        cookieHeader,
        referer: WEIXIN_CHANNEL_PLATFORM_REFERER,
        origin: WEIXIN_CHANNEL_ORIGIN,
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    )
    const data = getDataRecord(authData)
    const finderUser =
      asRecord(data?.finderUser) || asRecord(data?.finderUserInfo) || {}
    const finderId = firstString(finderUser.finderUsername, finderUser.uniqId) ?? ''

    return { cookieHeader, finderId, finderUser }
  } catch (error) {
    console.warn('[weixinChannelSession] Failed to resolve WeixinChannel context:', error)
    return null
  }
}

export async function postWeixinInteraction(
  ses: Session,
  ctx: WeixinChannelContext,
  url: string,
  body: Record<string, unknown>,
  options: WeixinChannelPostOptions = {}
): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(
      await fetchJson(ses, url, {
        cookieHeader: ctx.cookieHeader,
        referer: options.referer ?? WEIXIN_CHANNEL_PLATFORM_REFERER,
        origin: WEIXIN_CHANNEL_ORIGIN,
        method: 'POST',
        contentType: 'application/json',
        headers: options.headers,
        body: JSON.stringify(body)
      })
    )
  } catch (error) {
    console.warn(
      `[${options.logLabel ?? 'weixinChannelSession'}] WeixinChannel endpoint failed: ${url}`,
      error
    )
    return null
  }
}
