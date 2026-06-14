import type { Session } from 'electron'
import {
  isAnalyticsSupported,
  type AccountAnalyticsPlatform,
  type AccountAnalytics,
  type AccountAnalyticsPoint,
  type PlatformType
} from '../../shared/types'
import {
  asRecord,
  buildCookieHeader,
  fetchJson,
  pickFiniteNumber
} from './accountUserInfo'
import {
  buildWeixinInteractionBody,
  getWeixinChannelContext,
  postWeixinInteraction
} from './weixinChannelSession'

type AnalyticsFetcher = (ses: Session) => Promise<AccountAnalytics | null>
type AnalyticsOverview = AccountAnalytics['overview']
type AnalyticsMetricKey = keyof AnalyticsOverview

const COMPACT_CALENDAR_DATE_PATTERN = /^(\d{4})(\d{2})(\d{2})$/
const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/

const ANALYTICS_FETCHERS: Record<AccountAnalyticsPlatform, AnalyticsFetcher> = {
  bilibili: fetchBilibiliAnalytics,
  zhihu: fetchZhihuAnalytics,
  weibo: fetchWeiboAnalytics,
  weixinchannel: fetchWeixinChannelAnalytics
}

export async function fetchAccountAnalytics(
  ses: Session,
  platform: PlatformType
): Promise<AccountAnalytics | null> {
  if (!isAnalyticsSupported(platform)) return null
  const fetcher = ANALYTICS_FETCHERS[platform]

  try {
    return await fetcher(ses)
  } catch (error) {
    console.warn(`[accountAnalytics] Failed to fetch analytics for ${platform}:`, error)
    return null
  }
}

function timestamp13(): string {
  return Date.now().toString()
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function dateRange(days: number, endOffsetDays = 0): { start: Date; end: Date } {
  const end = startOfLocalDay(addDays(new Date(), endOffsetDays))
  const start = startOfLocalDay(addDays(end, -(days - 1)))
  return { start, end }
}

function seconds(date: Date): string {
  return String(Math.floor(date.getTime() / 1000)).padStart(10, '0')
}

function withQuery(url: string, params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value))
  }
  return `${url}?${searchParams.toString()}`
}

async function fetchRecord(
  ses: Session,
  platform: PlatformType,
  url: string,
  options: Parameters<typeof fetchJson>[2]
): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(await fetchJson(ses, url, options))
  } catch (error) {
    console.warn(`[accountAnalytics] ${platform} endpoint failed: ${url}`, error)
    return null
  }
}

function getDataRecord(json: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(json?.data) || json
}

function getNestedRecord(
  source: Record<string, unknown> | null | undefined,
  path: string[]
): Record<string, unknown> | null {
  let current: unknown = source
  for (const key of path) {
    current = asRecord(current)?.[key]
  }
  return asRecord(current)
}

function getNestedArray(
  source: Record<string, unknown> | null | undefined,
  path: string[]
): unknown[] {
  let current: unknown = source
  for (const key of path) {
    current = asRecord(current)?.[key]
  }
  return Array.isArray(current) ? current : []
}

function findFiniteNumber(value: unknown, keys: string[], depth = 0): number | undefined {
  if (depth > 4) return undefined
  const record = asRecord(value)
  if (!record) return undefined

  for (const key of keys) {
    const direct = pickFiniteNumber(record, key)
    if (direct !== undefined) return direct
  }

  for (const nested of Object.values(record)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findFiniteNumber(item, keys, depth + 1)
        if (found !== undefined) return found
      }
    } else if (nested !== null && typeof nested === 'object') {
      const found = findFiniteNumber(nested, keys, depth + 1)
      if (found !== undefined) return found
    }
  }

  return undefined
}

function assignMetric(
  overview: AnalyticsOverview,
  key: AnalyticsMetricKey,
  value: number | undefined
): void {
  if (typeof value === 'number' && Number.isFinite(value)) {
    overview[key] = value
  }
}

function sumNumericArray(values: unknown[]): number | undefined {
  let total = 0
  let count = 0

  for (const value of values) {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric)) {
      total += numeric
      count += 1
    }
  }

  return count > 0 ? total : undefined
}

function calendarDateFromParts(yearText: string, monthText: string, dayText: string): string | undefined {
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined
  }

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return `${yearText}-${monthText}-${dayText}`
}

function compactCalendarDateFromString(value: string): string | undefined {
  const match = COMPACT_CALENDAR_DATE_PATTERN.exec(value)
  return match ? calendarDateFromParts(match[1], match[2], match[3]) : undefined
}

function isoCalendarDateFromString(value: string): string | undefined {
  const match = ISO_CALENDAR_DATE_PATTERN.exec(value)
  return match ? calendarDateFromParts(match[1], match[2], match[3]) : undefined
}

function dateFromTimestamp(value: number): string | undefined {
  const date = new Date(value < 10_000_000_000 ? value * 1000 : value)
  return Number.isFinite(date.getTime()) ? formatDate(date) : undefined
}

function dateFromUnknown(value: unknown): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) return formatDate(value)

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      const text = String(value)
      if (COMPACT_CALENDAR_DATE_PATTERN.test(text)) {
        return compactCalendarDateFromString(text)
      }
    }
    return dateFromTimestamp(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim()
    if (ISO_CALENDAR_DATE_PATTERN.test(trimmed)) {
      return isoCalendarDateFromString(trimmed)
    }
    if (COMPACT_CALENDAR_DATE_PATTERN.test(trimmed)) {
      return compactCalendarDateFromString(trimmed)
    }
    if (/^\d+$/.test(trimmed)) {
      return dateFromTimestamp(Number(trimmed))
    }
    const parsed = new Date(trimmed)
    if (Number.isFinite(parsed.getTime())) return formatDate(parsed)
  }

  return undefined
}

function pointFromRecord(
  value: unknown,
  valueKeys: string[],
  dateKeys: string[]
): AccountAnalyticsPoint | null {
  const record = asRecord(value)
  if (!record) return null

  let pointValue: number | undefined
  for (const key of valueKeys) {
    pointValue = pickFiniteNumber(record, key)
    if (pointValue !== undefined) break
  }
  if (pointValue === undefined) return null

  for (const key of dateKeys) {
    const date = dateFromUnknown(record[key])
    if (date) return { date, value: pointValue }
  }

  return null
}

function pointsFromEndDate(values: unknown[], endDate: Date): AccountAnalyticsPoint[] {
  return values
    .flatMap((value, index) => {
      const numeric = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(numeric)) return []
      return [{ date: formatDate(addDays(endDate, -index)), value: numeric }]
    })
    .reverse()
}

function sortPoints(points: AccountAnalyticsPoint[]): AccountAnalyticsPoint[] {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.value) && isoCalendarDateFromString(point.date) !== undefined
    )
    .sort((a, b) => a.date.localeCompare(b.date))
}

function analytics(
  overview: AnalyticsOverview,
  fansTrend: AccountAnalyticsPoint[]
): AccountAnalytics {
  return {
    overview,
    fansTrend: sortPoints(fansTrend),
    updatedAt: Date.now()
  }
}

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(cookieHeader)
  return match?.[1]
}

async function getCookieValue(
  ses: Session,
  domains: string[],
  name: string
): Promise<string | undefined> {
  for (const domain of domains) {
    const cookies = await ses.cookies.get({ domain })
    const cookie = cookies.find((item) => item.name === name)
    if (cookie?.value) return cookie.value
  }
  return undefined
}

async function fetchBilibiliAnalytics(ses: Session): Promise<AccountAnalytics | null> {
  const cookieHeader = await buildCookieHeader(ses, '.bilibili.com')
  if (!cookieHeader || !cookieHeader.includes('SESSDATA=')) return null

  const overview: AnalyticsOverview = {}
  let mid: string | undefined

  const navJson = await fetchRecord(ses, 'bilibili', 'https://api.bilibili.com/x/web-interface/nav', {
    cookieHeader,
    referer: 'https://www.bilibili.com/'
  })
  const navData = getDataRecord(navJson)
  const navMid = navData?.mid
  if (typeof navMid === 'string' || typeof navMid === 'number') {
    mid = String(navMid)
  }

  const statNumJson = await fetchRecord(
    ses,
    'bilibili',
    withQuery('https://member.bilibili.com/x/web/data/v2/overview/stat/num', {
      period: 3,
      s_locale: 'zh_CN',
      tab: 0,
      t: timestamp13()
    }),
    {
      cookieHeader,
      referer: 'https://member.bilibili.com/platform/data-up/video/dataCenter/video',
      headers: { authority: 'member.bilibili.com' }
    }
  )
  const statNumData = getDataRecord(statNumJson)
  assignMetric(
    overview,
    'comments',
    findFiniteNumber(statNumData, ['comments', 'comment', 'comment_count', 'commentCount'])
  )
  assignMetric(
    overview,
    'works',
    findFiniteNumber(statNumData, [
      'works',
      'works_count',
      'archive_count',
      'archives',
      'video_count',
      'content_count'
    ])
  )
  assignMetric(overview, 'views', findFiniteNumber(statNumData, ['views', 'view', 'play', 'plays']))
  assignMetric(overview, 'likes', findFiniteNumber(statNumData, ['likes', 'like', 'like_count']))

  if (mid) {
    const relationJson = await fetchRecord(
      ses,
      'bilibili',
      withQuery('https://api.bilibili.com/x/relation/stat', { vmid: mid }),
      {
        cookieHeader,
        referer: 'https://www.bilibili.com/',
        headers: { authority: 'api.bilibili.com' }
      }
    )
    const relationData = getDataRecord(relationJson)
    assignMetric(overview, 'fans', pickFiniteNumber(relationData, 'follower'))
    assignMetric(overview, 'following', pickFiniteNumber(relationData, 'following'))

    const upstatJson = await fetchRecord(
      ses,
      'bilibili',
      withQuery('https://api.bilibili.com/x/space/upstat', { mid }),
      {
        cookieHeader,
        referer: 'https://space.bilibili.com/',
        headers: { authority: 'api.bilibili.com' }
      }
    )
    const upstatData = getDataRecord(upstatJson)
    assignMetric(overview, 'likes', pickFiniteNumber(upstatData, 'likes'))
    assignMetric(overview, 'views', pickFiniteNumber(asRecord(upstatData?.archive), 'view'))
  }

  const graphJson = await fetchRecord(
    ses,
    'bilibili',
    withQuery('https://member.bilibili.com/x/web/data/v2/overview/stat/graph', {
      period: 1,
      s_locale: 'zh_CN',
      type: 'play,visitor,fan,like,fav,coin,comment,dm,share,elec',
      t: timestamp13()
    }),
    {
      cookieHeader,
      referer: 'https://member.bilibili.com/platform/data-up/video/dataCenter/video',
      headers: { authority: 'member.bilibili.com' }
    }
  )
  const graphData = getDataRecord(graphJson)
  const tendency =
    asRecord(graphData?.data_tendency) ||
    asRecord(graphData?.dataTendency) ||
    asRecord(graphData?.tendency) ||
    graphData
  const fansTrend = (Array.isArray(tendency?.fan) ? tendency.fan : [])
    .flatMap((item) => {
      const point = pointFromRecord(
        item,
        ['total_inc', 'totalInc', 'value', 'inc', 'fans', 'followers'],
        ['date_key', 'dateKey', 'date', 'p_date', 'time']
      )
      return point ? [point] : []
    })

  return analytics(overview, fansTrend)
}

async function fetchZhihuAnalytics(ses: Session): Promise<AccountAnalytics | null> {
  const cookieHeader = await buildCookieHeader(ses, '.zhihu.com')
  if (!cookieHeader || !cookieHeader.includes('z_c0=')) return null

  const { start, end } = dateRange(30)
  const startDate = formatDate(start)
  const endDate = formatDate(end)
  const overview: AnalyticsOverview = {}

  const memberAggrJson = await fetchRecord(
    ses,
    'zhihu',
    withQuery('https://www.zhihu.com/api/v4/creators/analysis/realtime/member/aggr', {
      tab: 'all',
      start: startDate,
      end: endDate
    }),
    {
      cookieHeader,
      referer: 'https://www.zhihu.com/creator/analytics/work/all',
      headers: { authority: 'www.zhihu.com' }
    }
  )
  const memberAggrData = getDataRecord(memberAggrJson)
  assignMetric(
    overview,
    'fans',
    findFiniteNumber(memberAggrData, [
      'total_follower_count',
      'follower_count',
      'followers_count',
      'fans',
      'fans_count'
    ])
  )
  assignMetric(overview, 'views', findFiniteNumber(memberAggrData, ['pv', 'read', 'read_count']))
  assignMetric(overview, 'likes', findFiniteNumber(memberAggrData, ['like', 'upvote', 'likes']))
  assignMetric(overview, 'comments', findFiniteNumber(memberAggrData, ['comment', 'comments']))
  assignMetric(overview, 'works', findFiniteNumber(memberAggrData, ['content_count', 'works']))

  const dailyJson = await fetchRecord(
    ses,
    'zhihu',
    withQuery('https://www.zhihu.com/api/v4/creators/analysis/realtime/member/daily', {
      tab: 'all',
      start: startDate,
      end: endDate
    }),
    {
      cookieHeader,
      referer: 'https://www.zhihu.com/creator/analytics/work/all',
      headers: { authority: 'www.zhihu.com' }
    }
  )
  const dailyList = Array.isArray(dailyJson) ? dailyJson : Array.isArray(dailyJson?.data) ? dailyJson.data : []
  assignMetric(
    overview,
    'views',
    overview.views ?? sumDailyMetric(dailyList, ['pv', 'read', 'read_count'])
  )
  const upvote = sumDailyMetric(dailyList, ['upvote'])
  const like = sumDailyMetric(dailyList, ['like'])
  assignMetric(overview, 'likes', overview.likes ?? sumDefined([upvote, like]))
  assignMetric(overview, 'comments', overview.comments ?? sumDailyMetric(dailyList, ['comment']))

  const fansJson = await fetchRecord(
    ses,
    'zhihu',
    'https://www.zhihu.com/api/v4/creators/analysis/aggregation/tab/follow/detail?day=-30',
    {
      cookieHeader,
      referer: 'https://www.zhihu.com/creator/income-analysis?pageSource=creator_center_index_sidebar'
    }
  )
  const fansTrend = getNestedArray(fansJson, ['List'])
    .flatMap((item) => {
      const point = pointFromRecord(item, ['pre_follow', 'follow', 'value'], ['date', 'p_date'])
      return point ? [point] : []
    })

  return analytics(overview, fansTrend)
}

function sumDailyMetric(values: unknown[], keys: string[]): number | undefined {
  const metricValues = values.flatMap((value) => {
    const record = asRecord(value)
    if (!record) return []
    for (const key of keys) {
      const metric = pickFiniteNumber(record, key)
      if (metric !== undefined) return [metric]
    }
    return []
  })
  return sumNumericArray(metricValues)
}

function sumDefined(values: Array<number | undefined>): number | undefined {
  const finiteValues = values.filter((value): value is number => value !== undefined)
  if (finiteValues.length === 0) return undefined
  return finiteValues.reduce((total, value) => total + value, 0)
}

async function fetchWeiboAnalytics(ses: Session): Promise<AccountAnalytics | null> {
  const cookieHeader = await buildCookieHeader(ses, '.weibo.com')
  if (!cookieHeader || !cookieHeader.includes('SUB=')) return null

  const { start, end } = dateRange(30, -1)
  const overview: AnalyticsOverview = {}

  const nativeInfoJson = await fetchRecord(
    ses,
    'weibo',
    'https://e.weibo.com/v1/eps/native/info',
    {
      cookieHeader,
      referer:
        'https://e.weibo.com/v1/eps/manage/home?url=https%3A%2F%2Fe.weibo.com%2Fv1%2Feps%2Fhomepage',
      headers: {
        authority: 'weibo.com',
        'x-requested-with': 'XMLHttpRequest'
      }
    }
  )
  const nativeData = getDataRecord(nativeInfoJson)
  assignMetric(
    overview,
    'fans',
    findFiniteNumber(nativeData, ['followers_count', 'fans', 'fans_count'])
  )
  assignMetric(overview, 'following', findFiniteNumber(nativeData, ['friends_count', 'following']))
  assignMetric(overview, 'works', findFiniteNumber(nativeData, ['statuses_count', 'works']))
  assignMetric(overview, 'likes', findFiniteNumber(nativeData, ['total_cnt', 'likeTotal']))

  const readTrendJson = await fetchWeiboChart(
    ses,
    cookieHeader,
    'https://dss.sc.weibo.com/pc/aj/chart/content/weiboReadTrend',
    start,
    end
  )
  const readTrend = getNestedRecord(readTrendJson, ['data', 'chart', 'weiboReadTrend'])
  assignMetric(overview, 'views', pickFiniteNumber(readTrend, 'readTotal'))
  assignMetric(overview, 'works', overview.works ?? pickFiniteNumber(readTrend, 'weiboTotal'))

  const interactJson = await fetchWeiboChart(
    ses,
    cookieHeader,
    'https://dss.sc.weibo.com/pc/aj/chart/content/weiboInteract',
    start,
    end
  )
  const interact = getNestedRecord(interactJson, ['data', 'chart', 'weiboInteract'])
  assignMetric(overview, 'comments', pickFiniteNumber(interact, 'commentTotal'))
  assignMetric(overview, 'likes', pickFiniteNumber(interact, 'likeTotal'))

  const fansJson = await fetchWeiboChart(
    ses,
    cookieHeader,
    'https://dss.sc.weibo.com/pc/aj/chart/fans/fansTrend',
    start,
    end
  )
  const tIncrTrend = getNestedArray(fansJson, ['data', 'chart', 'fansTrend', 'tIncrTrend'])
  const fansTrend = pointsFromEndDate(tIncrTrend, end)

  return analytics(overview, fansTrend)
}

async function fetchWeiboChart(
  ses: Session,
  cookieHeader: string,
  url: string,
  start: Date,
  end: Date
): Promise<Record<string, unknown> | null> {
  return fetchRecord(
    ses,
    'weibo',
    withQuery(url, {
      starttime: formatDate(start),
      endtime: formatDate(end),
      _: timestamp13()
    }),
    {
      cookieHeader,
      referer: 'https://dss.sc.weibo.com/pc/index',
      headers: { 'x-requested-with': 'XMLHttpRequest' }
    }
  )
}

async function fetchWeixinChannelAnalytics(ses: Session): Promise<AccountAnalytics | null> {
  const ctx = await getWeixinChannelContext(ses)
  if (!ctx) return null

  const finderUser = ctx.finderUser
  const finderId = ctx.finderId
  if (!finderId) return analytics({}, [])

  const uin =
    stringValue(finderUser?.uin) ||
    parseCookieValue(ctx.cookieHeader, 'uin') ||
    (await getCookieValue(ses, ['.qq.com', 'qq.com'], 'uin')) ||
    ''
  const { start, end } = dateRange(30)
  const overview: AnalyticsOverview = {}
  assignMetric(overview, 'fans', pickFiniteNumber(finderUser, 'fansCount'))

  const totalJson = await postWeixinInteraction(
    ses,
    ctx,
    'https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/statistic/new_post_total_data',
    buildWeixinChannelStatisticBody(start, end, finderId),
    {
      referer: 'https://channels.weixin.qq.com/platform/statistic/post',
      headers: weixinChannelAnalyticsHeaders(uin),
      logLabel: 'accountAnalytics'
    }
  )
  const totalData = getNestedRecord(totalJson, ['data', 'totalData'])
  assignMetric(overview, 'views', sumNumericArray(getMetricArray(totalData, ['browse'])))
  assignMetric(
    overview,
    'likes',
    sumDefined([
      sumNumericArray(getMetricArray(totalData, ['like'])),
      sumNumericArray(getMetricArray(totalData, ['fav']))
    ])
  )
  assignMetric(overview, 'comments', sumNumericArray(getMetricArray(totalData, ['comment'])))

  const fansJson = await postWeixinInteraction(
    ses,
    ctx,
    withQuery(
      'https://channels.weixin.qq.com/micro/statistic/cgi-bin/mmfinderassistant-bin/statistic/fans_trend',
      {
        _rid: '',
        _aid: '',
        _pageUrl: 'https://channels.weixin.qq.com/micro/statistic/follower'
      }
    ),
    buildWeixinChannelStatisticBody(start, end, finderId, { _log_finder_uin: null }),
    {
      referer: 'https://channels.weixin.qq.com/platform/statistic/postDetail',
      headers: weixinChannelAnalyticsHeaders(uin),
      logLabel: 'accountAnalytics'
    }
  )
  const fansTrend = parseWeixinChannelFansTrend(fansJson, end)

  return analytics(overview, fansTrend)
}

function buildWeixinChannelStatisticBody(
  start: Date,
  end: Date,
  finderId: string,
  body: Record<string, unknown> = {}
): Record<string, unknown> {
  return buildWeixinInteractionBody(finderId, {
    startTs: seconds(start),
    endTs: seconds(end),
    interval: 3,
    timestamp: timestamp13(),
    ...body
  })
}

function weixinChannelAnalyticsHeaders(uin: string): Record<string, string> {
  return {
    'X-WECHAT-UIN': uin,
    'finger-print-device-id': randomDeviceId()
  }
}

function randomDeviceId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function getMetricArray(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown[] {
  if (!source) return []
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function parseWeixinChannelFansTrend(
  json: Record<string, unknown> | null,
  endDate: Date
): AccountAnalyticsPoint[] {
  const data = getDataRecord(json)
  const directLists = [
    getNestedArray(data, ['fansTrend']),
    getNestedArray(data, ['list']),
    getNestedArray(data, ['dataList']),
    getNestedArray(data, ['trend'])
  ].find((list) => list.length > 0)

  if (directLists) {
    const recordPoints = directLists.flatMap((item) => {
      const point = pointFromRecord(
        item,
        ['fansCount', 'followCount', 'netFansCount', 'value', 'count'],
        ['date', 'dateKey', 'date_key', 'timestamp', 'time']
      )
      return point ? [point] : []
    })
    if (recordPoints.length > 0) return recordPoints

    return pointsFromEndDate(directLists, endDate)
  }

  const totals = ['follow', 'fans', 'fansCount', 'netFansCount']
    .map((key) => getMetricArray(asRecord(data?.totalData), [key]))
    .find((list) => list.length > 0)

  return totals ? pointsFromEndDate(totals, endDate) : []
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}
