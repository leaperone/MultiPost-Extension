/* eslint-disable @typescript-eslint/no-explicit-any */
import { isbot } from 'isbot';
import { startOfHour, startOfMonth } from 'date-fns';
import { secret, uuid, hash } from '@/lib/crypto';
import { createToken, parseToken } from '@/lib/jwt';
import { getClientInfo, hasBlockedIp } from '@/lib/detect';
import { fetchWebsite, fetchSession, createSession, saveEvent, saveSessionData } from './db';
import { json, badRequest, forbidden, serverError } from '@/lib/response';
import { EVENT_TYPE, COLLECTION_TYPE } from '@/lib/constants';
import { z } from 'zod';
import { safeDecodeURI, safeDecodeURIComponent } from '@/lib/url';

// Schema 定义
export const anyObjectParam = z.record(z.any());
export const urlOrPathParam = z.string().max(500);

export const schema = z.object({
  type: z.enum(['event', 'identify', 'predefinedEvent']),
  payload: z.object({
    website: z.string(),
    data: anyObjectParam.optional(),
    hostname: z.string().max(100).optional(),
    language: z.string().max(35).optional(),
    referrer: urlOrPathParam.optional(),
    screen: z.string().max(11).optional(),
    title: z.string().optional(),
    url: urlOrPathParam.optional(),
    name: z.string().max(50).optional(),
    tag: z.string().max(50).optional(),
    ip: z.string().ip().optional(),
    userAgent: z.string().optional(),
    timestamp: z.coerce.number().int().optional(),
  }),
});

// 定义缓存类型
interface Cache {
  websiteId: string;
  sessionId: string;
  visitId: string;
  iat: number;
}

interface CreateSessionData {
  id: string;
  websiteId: string;
  hostname?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  subdivision1?: string;
  subdivision2?: string;
  city?: string;
  ip?: string;
}

// 将 null 转换为 undefined 的辅助函数
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// 安全解码 URI，确保返回字符串
function ensureString(value: string | null | undefined): string {
  return value || '';
}

export async function POST(request: Request) {
  try {
    // Bot 检查
    if (!process.env.DISABLE_BOT_CHECK && isbot(request.headers.get('user-agent'))) {
      return json({ beep: 'boop' });
    }

    // 解析请求体
    const body = await request.json();
    if (!body) {
      return badRequest('Invalid request body.');
    }

    console.log('body', body);

    // 验证请求体格式
    const result = schema.safeParse(body);
    if (!result.success) {
      return badRequest('Invalid request format.');
    }

    const { type, payload } = result.data;
    const {
      website: websiteId,
      hostname,
      screen,
      language,
      url,
      referrer,
      name,
      data,
      title,
      tag,
      timestamp,
    } = payload;

    // 缓存检查
    let cache: Cache | null = null;
    const cacheHeader = request.headers.get('x-multidata-cache');

    if (cacheHeader) {
      const result = parseToken(cacheHeader, secret());
      if (result) {
        cache = result as Cache;
      }
    }

    // 查找网站
    if (!cache?.websiteId) {
      const website = await fetchWebsite(websiteId);
      if (!website) {
        return badRequest('Website not found.');
      }
    }

    // 获取客户端信息
    const { ip, userAgent, device, browser, os, country, subdivision1, subdivision2, city } = await getClientInfo(
      request,
      payload,
    );

    // IP 黑名单检查
    if (ip && hasBlockedIp(ip)) {
      return forbidden();
    }

    const createdAt = timestamp ? new Date(timestamp * 1000) : new Date();
    const now = Math.floor(Date.now() / 1000);

    const sessionSalt = hash(startOfMonth(createdAt).toUTCString());
    const visitSalt = hash(startOfHour(createdAt).toUTCString());

    const sessionId = uuid(websiteId, ip, userAgent, sessionSalt);

    // 查找会话
    const session = await fetchSession(websiteId, sessionId);

    // 如果会话不存在则创建
    if (!session) {
      try {
        const sessionData: CreateSessionData = {
          id: sessionId,
          websiteId,
          hostname,
          browser: nullToUndefined(browser),
          os: os || 'unknown',
          device,
          screen,
          language,
          country: nullToUndefined(country),
          subdivision1: nullToUndefined(subdivision1),
          subdivision2: nullToUndefined(subdivision2),
          city: nullToUndefined(city),
          ip,
        };
        await createSession(sessionData);
      } catch (error) {
        const err = error as Error;
        if (!err.message.toLowerCase().includes('unique constraint')) {
          return serverError(err);
        }
      }
    }

    // 访问信息
    let visitId = cache?.visitId || uuid(sessionId, visitSalt);
    let iat = cache?.iat || now;

    // 30分钟后访问过期
    if (!timestamp && now - iat > 1800) {
      visitId = uuid(sessionId, visitSalt);
      iat = now;
    }

    // 处理事件类型
    if (type === COLLECTION_TYPE.event || type === COLLECTION_TYPE.predefinedEvent) {
      const base = hostname ? `https://${hostname}` : 'https://localhost';
      const currentUrl = new URL(url || '', base);

      const urlPath = ensureString(safeDecodeURI(currentUrl.pathname));
      const urlQuery = currentUrl.search.substring(1);
      const urlDomain = currentUrl.hostname.replace(/^www./, '');

      let referrerPath: string | undefined;
      let referrerQuery: string | undefined;
      let referrerDomain: string | undefined;

      if (referrer) {
        const referrerUrl = new URL(referrer, base);

        referrerPath = referrerUrl.pathname;
        referrerQuery = referrerUrl.search.substring(1);

        if (referrerUrl.hostname !== 'localhost') {
          referrerDomain = referrerUrl.hostname.replace(/^www\./, '');
        }
      }

      let eventType: number = EVENT_TYPE.pageView;

      if (type === COLLECTION_TYPE.predefinedEvent) {
        eventType = EVENT_TYPE.predefinedEvent;
      } else if (name) {
        eventType = EVENT_TYPE.customEvent;
      }

      await saveEvent({
        websiteId,
        sessionId,
        visitId,
        urlPath,
        urlQuery,
        referrerPath: referrerPath ? ensureString(safeDecodeURI(referrerPath)) : undefined,
        referrerQuery,
        referrerDomain,
        pageTitle: title ? ensureString(safeDecodeURIComponent(title)) : undefined,
        eventName: name,
        eventData: data,
        eventType,
        hostname: hostname || urlDomain,
        browser: nullToUndefined(browser),
        os: os || 'unknown',
        device,
        screen,
        language,
        country: nullToUndefined(country),
        subdivision1: nullToUndefined(subdivision1),
        subdivision2: nullToUndefined(subdivision2),
        city: nullToUndefined(city),
        tag,
        createdAt,
      });
    }

    // 处理身份识别类型
    if (type === COLLECTION_TYPE.identify) {
      if (!data) {
        return badRequest('Data required.');
      }

      await saveSessionData({
        websiteId,
        sessionId,
        sessionData: data,
        createdAt,
      });
    }

    const token = createToken({ websiteId, sessionId, visitId, iat }, secret());

    return json({ cache: token, sessionId, visitId });
  } catch (error) {
    console.log('error', error);
    return serverError(error as Error);
  }
}
