import type { Session } from 'electron'
import * as crypto from 'node:crypto'
import type { AccountComment, AccountPost, DmMessage, DmSession } from '../../shared/types'
import {
  asRecord,
  pickFiniteNumber,
  stringValue
} from './accountUserInfo'
import {
  buildWeixinInteractionBody,
  getWeixinChannelContext,
  postWeixinInteraction,
  type WeixinChannelContext
} from './weixinChannelSession'

const INTERACTION_BASE =
  'https://channels.weixin.qq.com/micro/interaction/cgi-bin/mmfinderassistant-bin'
const PLATFORM_POST_CREATE_REFERER = 'https://channels.weixin.qq.com/platform/post/create'
const MICRO_PRIVATE_MSG_REFERER = 'https://channels.weixin.qq.com/micro/interaction/private_msg'
const MAX_INTERACTION_PAGES = 10

interface MessagePage {
  messages: Record<string, unknown>[]
  cookie?: string
}

function interactionUrl(path: string, pageUrl?: string): string {
  const searchParams = new URLSearchParams({
    _rid: crypto.randomUUID(),
    _aid: crypto.randomUUID()
  })
  if (pageUrl) searchParams.set('_pageUrl', pageUrl)
  return `${INTERACTION_BASE}/${path}?${searchParams.toString()}`
}

export function buildInteractionBody(
  finderId: string,
  body: Record<string, unknown> = {}
): Record<string, unknown> {
  return buildWeixinInteractionBody(finderId, body)
}

function getDataRecord(json: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(json?.data) || json
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = stringValue(value)
    if (text) return text
  }
  return undefined
}

function timestampValue(value: unknown): number | undefined {
  const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(raw) || raw <= 0) return undefined
  return raw < 10_000_000_000 ? raw * 1000 : raw
}

function normalizeTextMsg(value: unknown): string | undefined {
  const record = asRecord(value)
  return firstString(record?.content, record?.text)
}

async function fetchWeixinRecord(
  ses: Session,
  url: string,
  ctx: WeixinChannelContext,
  referer: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  return postWeixinInteraction(ses, ctx, url, body, {
    referer,
    logLabel: 'accountInteractions'
  })
}

export async function resolveFinderId(ses: Session): Promise<string | null> {
  return (await getWeixinChannelContext(ses))?.finderId || null
}

function normalizePost(value: unknown): AccountPost | null {
  const record = asRecord(value)
  if (!record) return null

  const desc = asRecord(record.desc)
  const finderDesc = asRecord(desc?.finderNewlifeDesc)
  const id = firstString(record.exportId, record.export_id, record.feedId, record.id)
  if (!id) return null

  return {
    id,
    title: firstString(
      finderDesc?.richTextTitle,
      desc?.description,
      record.title,
      record.feedTitle,
      record.description
    ),
    createdAt: timestampValue(record.createTime ?? record.create_time ?? record.timestamp),
    commentCount: pickFiniteNumber(record, 'commentCount') ?? pickFiniteNumber(record, 'comment_count')
  }
}

async function listPostsForType(
  ses: Session,
  ctx: WeixinChannelContext,
  userpageType: number
): Promise<AccountPost[]> {
  const json = await fetchWeixinRecord(
    ses,
    interactionUrl('post/post_list'),
    ctx,
    PLATFORM_POST_CREATE_REFERER,
    buildInteractionBody(ctx.finderId, {
      pageSize: 20,
      currentPage: 1,
      onlyUnread: false,
      userpageType,
      needAllCommentCount: true,
      forMcn: false
    })
  )
  return asArray(getDataRecord(json)?.list).flatMap((item) => {
    const post = normalizePost(item)
    return post ? [post] : []
  })
}

export async function listPosts(ses: Session): Promise<AccountPost[]> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    if (!ctx?.finderId) return []

    const posts = await Promise.all([listPostsForType(ses, ctx, 12), listPostsForType(ses, ctx, 13)])
    const deduped = new Map<string, AccountPost>()
    for (const post of posts.flat()) {
      if (!deduped.has(post.id)) deduped.set(post.id, post)
    }
    return Array.from(deduped.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  } catch (error) {
    console.warn('[accountInteractions] Failed to list WeixinChannel posts:', error)
    return []
  }
}

function normalizeComment(value: unknown): AccountComment | null {
  const record = asRecord(value)
  if (!record) return null

  const id = firstString(record.commentId, record.id)
  if (!id) return null

  const levelTwo = asArray(record.levelTwoComment)
  const replyCount =
    pickFiniteNumber(record, 'commentCount') ??
    pickFiniteNumber(record, 'replyCount') ??
    (levelTwo.length > 0 || record.downContinueFlag === 1
      ? levelTwo.length + (record.downContinueFlag === 1 ? 1 : 0)
      : undefined)

  return {
    id,
    content: firstString(record.commentContent, record.content, record.text) ?? '',
    author: firstString(record.commentNickname, record.nickname, record.author),
    createdAt: timestampValue(record.commentCreatetime ?? record.createTime ?? record.timestamp),
    replyCount
  }
}

export async function listComments(ses: Session, exportId: string): Promise<AccountComment[]> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    if (!ctx?.finderId || !exportId) return []

    const comments: AccountComment[] = []
    const seenCursors = new Set<string>()
    let lastBuff = ''

    for (let page = 0; page < MAX_INTERACTION_PAGES; page += 1) {
      const json = await fetchWeixinRecord(
        ses,
        interactionUrl('comment/comment_list'),
        ctx,
        PLATFORM_POST_CREATE_REFERER,
        buildInteractionBody(ctx.finderId, {
          lastBuff,
          exportId,
          commentSelection: false,
          forMcn: false
        })
      )
      const data = getDataRecord(json)
      comments.push(
        ...asArray(data?.comment).flatMap((item) => {
          const comment = normalizeComment(item)
          return comment ? [comment] : []
        })
      )

      const nextLastBuff = firstString(data?.lastBuff, data?.last_buff)
      if (!nextLastBuff || nextLastBuff === lastBuff || seenCursors.has(nextLastBuff)) break
      seenCursors.add(nextLastBuff)
      lastBuff = nextLastBuff
    }

    return comments
  } catch (error) {
    console.warn('[accountInteractions] Failed to list WeixinChannel comments:', error)
    return []
  }
}

function commentReplyPayload(replyCommentId: string): Record<string, unknown> {
  return {
    replyCommentId,
    rootCommentId: replyCommentId,
    comment: {
      levelTwoComment: [],
      commentId: replyCommentId,
      commentNickname: '',
      commentContent: '',
      commentHeadurl: '',
      commentCreatetime: '',
      commentLikeCount: 0,
      replyCommentId,
      replyContent: '',
      lastBuff: '',
      downContinueFlag: 0,
      visibleFlag: 0,
      readFlag: true,
      displayFlag: 0,
      blacklistFlag: 0,
      likeFlag: 0
    }
  }
}

export async function createComment(
  ses: Session,
  exportId: string,
  content: string,
  replyCommentId?: string
): Promise<AccountComment | null> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    const trimmed = content.trim()
    if (!ctx?.finderId || !exportId || !trimmed) return null

    const json = await fetchWeixinRecord(
      ses,
      interactionUrl('comment/create_comment'),
      ctx,
      PLATFORM_POST_CREATE_REFERER,
      buildInteractionBody(ctx.finderId, {
        content: trimmed,
        clientId: crypto.randomUUID().replaceAll('-', ''),
        comment: {},
        exportId,
        ...(replyCommentId ? commentReplyPayload(replyCommentId) : {})
      })
    )
    if (pickFiniteNumber(json, 'errCode') !== 0) return null

    const data = getDataRecord(json)
    const id = firstString(data?.commentId, data?.id)
    return id ? { id, content: trimmed, createdAt: Date.now() } : null
  } catch (error) {
    console.warn('[accountInteractions] Failed to create WeixinChannel comment:', error)
    return null
  }
}

async function fetchHistoryMessages(
  ses: Session,
  ctx: WeixinChannelContext,
  cookie = ''
): Promise<MessagePage> {
  const json = await fetchWeixinRecord(
    ses,
    interactionUrl(
      'private-msg/get-history-msg',
      'https://channels.weixin.qq.com/micro/interaction/private_msg'
    ),
    ctx,
    MICRO_PRIVATE_MSG_REFERER,
    buildInteractionBody(ctx.finderId, { cookie })
  )
  const data = getDataRecord(json)
  return {
    messages: asArray(data?.msg).flatMap((item) => {
      const record = asRecord(item)
      return record ? [record] : []
    }),
    cookie: firstString(data?.cookie)
  }
}

async function fetchNewMessages(
  ses: Session,
  ctx: WeixinChannelContext,
  cookie = ''
): Promise<MessagePage> {
  const json = await fetchWeixinRecord(
    ses,
    interactionUrl(
      'private-msg/get-new-msg',
      'https://channels.weixin.qq.com/micro/interaction/private_msg'
    ),
    ctx,
    MICRO_PRIVATE_MSG_REFERER,
    buildInteractionBody(ctx.finderId, {
      cookie,
      _log_finder_uin: null
    })
  )
  const data = getDataRecord(json)
  return {
    messages: asArray(data?.msg).flatMap((item) => {
      const record = asRecord(item)
      return record ? [record] : []
    }),
    cookie: firstString(data?.cookie)
  }
}

async function fetchPagedMessages(
  fetchPage: (cookie: string) => Promise<MessagePage>
): Promise<Record<string, unknown>[]> {
  const messages: Record<string, unknown>[] = []
  const seenCursors = new Set<string>()
  let cookie = ''

  for (let page = 0; page < MAX_INTERACTION_PAGES; page += 1) {
    const result = await fetchPage(cookie)
    messages.push(...result.messages)

    const nextCookie = result.cookie ?? ''
    if (!nextCookie || nextCookie === cookie || seenCursors.has(nextCookie)) break
    seenCursors.add(nextCookie)
    cookie = nextCookie
  }

  return messages
}

async function fetchSessionInfo(
  ses: Session,
  ctx: WeixinChannelContext,
  sessionIds: string[]
): Promise<Record<string, unknown>[]> {
  if (sessionIds.length === 0) return []

  const json = await fetchWeixinRecord(
    ses,
    interactionUrl('private-msg/get-session-info'),
    ctx,
    PLATFORM_POST_CREATE_REFERER,
    buildInteractionBody(ctx.finderId, { sessionId: sessionIds })
  )
  return asArray(getDataRecord(json)?.sessionInfo).flatMap((item) => {
    const record = asRecord(item)
    return record ? [record] : []
  })
}

function messageText(record: Record<string, unknown>): string | undefined {
  return (
    normalizeTextMsg(record.textMsg) ??
    firstString(record.content, record.text, pickFiniteNumber(record, 'msgType') === 3 ? '[图片]' : undefined)
  )
}

function normalizeMessage(record: Record<string, unknown>, finderId: string): DmMessage | null {
  const sessionId = firstString(record.sessionId)
  const createdAt = timestampValue(record.ts ?? record.timestamp ?? record.createTime)
  const id =
    firstString(record.svrMsgId, record.cliMsgId, record.msgId, record.id) ??
    [sessionId, createdAt, record.fromUsername].filter(Boolean).join(':')
  if (!id) return null

  return {
    id,
    fromMe: firstString(record.fromUsername) === finderId,
    text: messageText(record),
    createdAt
  }
}

function normalizeDmSession(
  sessionId: string,
  info: Record<string, unknown> | undefined,
  lastMessage: Record<string, unknown> | undefined
): DmSession {
  return {
    id: sessionId,
    peerUsername: firstString(info?.username),
    peerName: firstString(info?.nickname, info?.name),
    peerAvatar: firstString(info?.headImgUrl, info?.avatar),
    unread: pickFiniteNumber(info, 'unreadCount') ?? pickFiniteNumber(info, 'unread'),
    lastMessage: lastMessage ? messageText(lastMessage) : undefined,
    lastTime: lastMessage
      ? timestampValue(lastMessage.ts ?? lastMessage.timestamp ?? lastMessage.createTime)
      : undefined
  }
}

export async function listDmSessions(ses: Session): Promise<DmSession[]> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    if (!ctx?.finderId) return []

    const [historyMessages, freshMessages] = await Promise.all([
      fetchPagedMessages((cookie) => fetchHistoryMessages(ses, ctx, cookie)),
      fetchPagedMessages((cookie) => fetchNewMessages(ses, ctx, cookie))
    ])
    const latestBySession = new Map<string, Record<string, unknown>>()

    for (const message of [...historyMessages, ...freshMessages]) {
      const sessionId = firstString(message.sessionId)
      if (!sessionId) continue
      const current = latestBySession.get(sessionId)
      const currentTime = timestampValue(current?.ts ?? current?.timestamp ?? current?.createTime) ?? 0
      const nextTime = timestampValue(message.ts ?? message.timestamp ?? message.createTime) ?? 0
      if (!current || nextTime >= currentTime) {
        latestBySession.set(sessionId, message)
      }
    }

    const sessionIds = Array.from(latestBySession.keys())
    const sessionInfo = await fetchSessionInfo(ses, ctx, sessionIds)
    const infoBySession = new Map<string, Record<string, unknown>>()
    for (const info of sessionInfo) {
      const sessionId = firstString(info.sessionId)
      if (sessionId) infoBySession.set(sessionId, info)
    }

    return sessionIds
      .map((sessionId) =>
        normalizeDmSession(sessionId, infoBySession.get(sessionId), latestBySession.get(sessionId))
      )
      .sort((a, b) => (b.lastTime ?? 0) - (a.lastTime ?? 0))
  } catch (error) {
    console.warn('[accountInteractions] Failed to list WeixinChannel DM sessions:', error)
    return []
  }
}

export async function listDmMessages(
  ses: Session,
  sessionCursor: string
): Promise<DmMessage[]> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    if (!ctx?.finderId || !sessionCursor) return []

    const [historyMessages, freshMessages] = await Promise.all([
      fetchPagedMessages((cookie) => fetchHistoryMessages(ses, ctx, cookie)),
      fetchPagedMessages((cookie) => fetchNewMessages(ses, ctx, cookie))
    ])
    const deduped = new Map<string, DmMessage>()

    for (const record of [...historyMessages, ...freshMessages]) {
      if (firstString(record.sessionId) !== sessionCursor) continue
      const message = normalizeMessage(record, ctx.finderId)
      if (message) deduped.set(message.id, message)
    }

    return Array.from(deduped.values()).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  } catch (error) {
    console.warn('[accountInteractions] Failed to list WeixinChannel DM messages:', error)
    return []
  }
}

async function resolveDmTarget(
  ses: Session,
  ctx: WeixinChannelContext,
  toUsername: string,
  sessionId?: string
): Promise<{ sessionId: string; toUsername: string } | null> {
  const trimmedToUsername = toUsername.trim()
  const trimmedSessionId = sessionId?.trim()
  if (trimmedSessionId) {
    const [info] = await fetchSessionInfo(ses, ctx, [trimmedSessionId])
    return {
      sessionId: trimmedSessionId,
      toUsername: firstString(info?.username) ?? trimmedToUsername
    }
  }

  if (!trimmedToUsername) return null

  const [possibleSessionInfo] = await fetchSessionInfo(ses, ctx, [trimmedToUsername])
  if (possibleSessionInfo) {
    return {
      sessionId: trimmedToUsername,
      toUsername: firstString(possibleSessionInfo.username) ?? trimmedToUsername
    }
  }

  const sessions = await listDmSessions(ses)
  const matched = sessions.find(
    (session) => session.peerUsername === trimmedToUsername || session.id === trimmedToUsername
  )
  if (!matched) return null

  return {
    sessionId: matched.id,
    toUsername: matched.peerUsername ?? trimmedToUsername
  }
}

export async function sendDm(
  ses: Session,
  toUsername: string,
  text: string,
  sessionId?: string
): Promise<DmMessage | null> {
  try {
    const ctx = await getWeixinChannelContext(ses)
    const trimmedText = text.trim()
    if (!ctx?.finderId || !trimmedText) return null

    const target = await resolveDmTarget(ses, ctx, toUsername, sessionId)
    if (!target) return null

    const json = await fetchWeixinRecord(
      ses,
      interactionUrl('private-msg/send-private-msg'),
      ctx,
      PLATFORM_POST_CREATE_REFERER,
      buildInteractionBody(ctx.finderId, {
        msgPack: {
          sessionId: target.sessionId,
          fromUsername: ctx.finderId,
          toUsername: target.toUsername,
          msgType: 1,
          textMsg: { content: trimmedText },
          cliMsgId: crypto.randomUUID()
        }
      })
    )
    if (pickFiniteNumber(json, 'errCode') !== 0) return null

    const data = getDataRecord(json)
    const id = firstString(data?.svrMsgId, data?.msgId, data?.cliMsgId)
    return id ? { id, fromMe: true, text: trimmedText, createdAt: Date.now() } : null
  } catch (error) {
    console.warn('[accountInteractions] Failed to send WeixinChannel DM:', error)
    return null
  }
}
