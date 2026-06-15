import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3,
  CheckCircle,
  CheckCircle2,
  FolderPlus,
  LogIn,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  XCircle
} from 'lucide-react'
import {
  CONTENT_TYPE_LABELS,
  getPlatformAccountKey,
  PLATFORMS
} from '@shared/constants'
import {
  isAnalyticsSupported,
  type Account,
  type AccountAnalytics,
  type AccountComment,
  type AccountHealthStatus,
  type AccountPost,
  type AccountStats,
  type AccountGroup,
  type DmMessage,
  type DmSession,
  type PlatformType,
  type ProxyProfile,
  type ProxySettings,
  type SyncContentType
} from '@shared/types'
import { PLATFORM_CATEGORIES, PlatformIcon } from '../publish/shared'
import { AccountAvatar } from '../AccountAvatar'
import {
  PROXY_CREATE_VALUE,
  PROXY_NONE_VALUE,
  ProxyProfileFormDialog
} from './ProxyPage'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { SimpleSelect } from '../ui/select'
import { Tooltip } from '../ui/tooltip'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Spinner } from '../ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { toast } from '../ui/sonner'

interface AccountsPageProps {
  onLoginAccount?: (account: Account) => void
}

type ContentTypeFilter = 'ALL' | SyncContentType

type StatusFilter = 'all' | 'online' | 'offline'

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'online', label: '已登录' },
  { key: 'offline', label: '未登录' }
]

const CONTENT_TYPE_FILTERS: Array<{ key: ContentTypeFilter; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'DYNAMIC', label: CONTENT_TYPE_LABELS.DYNAMIC },
  { key: 'VIDEO', label: CONTENT_TYPE_LABELS.VIDEO },
  { key: 'ARTICLE', label: CONTENT_TYPE_LABELS.ARTICLE },
  { key: 'PODCAST', label: CONTENT_TYPE_LABELS.PODCAST }
]

// Radix Select reserves the empty string, so "ungrouped" needs a sentinel value
const UNGROUPED_VALUE = '__ungrouped__'

function getSelectableProxyId(
  proxyId: string | null | undefined,
  proxies: ProxyProfile[]
): string | null {
  if (proxyId && proxies.some((proxy) => proxy.id === proxyId)) {
    return proxyId
  }
  return null
}

function formatProxyOption(profile: ProxyProfile): string {
  return `${profile.name} · ${profile.protocol.toUpperCase()} ${profile.host}:${profile.port}`
}

function getPlatformContentTypes(platform: PlatformType): SyncContentType[] {
  return PLATFORMS[platform]?.supportedContentTypes || []
}

function getAccountLabel(account: Account): string {
  return account.displayName || account.username || '未命名账号'
}

const ACCOUNT_STAT_LABELS: Array<{
  key: keyof Pick<AccountStats, 'fans' | 'following' | 'likes' | 'works' | 'views'>
  label: string
}> = [
  { key: 'fans', label: '粉丝' },
  { key: 'following', label: '关注' },
  { key: 'likes', label: '获赞' },
  { key: 'works', label: '作品' },
  { key: 'views', label: '播放' }
]

const ANALYTICS_METRIC_LABELS: Array<{
  key: keyof AccountAnalytics['overview']
  label: string
}> = [
  { key: 'fans', label: '粉丝' },
  { key: 'following', label: '关注' },
  { key: 'views', label: '播放' },
  { key: 'likes', label: '获赞' },
  { key: 'comments', label: '评论' },
  { key: 'works', label: '作品' }
]

function supportsAccountAnalytics(platform: PlatformType): boolean {
  return isAnalyticsSupported(platform)
}

function formatAccountStats(stats: AccountStats | undefined): string | null {
  if (!stats) return null

  const parts = ACCOUNT_STAT_LABELS.flatMap(({ key, label }) => {
    const value = stats[key]
    return typeof value === 'number' && Number.isFinite(value)
      ? [`${value.toLocaleString()} ${label}`]
      : []
  })

  return parts.length > 0 ? parts.join(' · ') : null
}

function formatAccountHealthBadge(health: AccountHealthStatus | undefined): string | null {
  if (!health || (health.state !== 'restricted' && health.state !== 'banned')) return null
  return health.reason || (health.state === 'banned' ? '账号被封禁' : '账号受限')
}

function PlatformContentBadges({ platform }: { platform: PlatformType }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getPlatformContentTypes(platform).map((contentType) => (
        <Badge key={contentType} size="sm">
          {CONTENT_TYPE_LABELS[contentType]}
        </Badge>
      ))}
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}): React.ReactElement {
  return (
    <div className={`relative ${className || ''}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}

function formatAnalyticsValue(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : ''
}

function AnalyticsSparkline({
  points
}: {
  points: AccountAnalytics['fansTrend']
}): React.ReactElement | null {
  if (points.length === 0) return null

  const max = Math.max(...points.map((point) => Math.abs(point.value)), 1)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>粉丝趋势</span>
        <span>{points.length} 天</span>
      </div>
      <div className="flex h-24 items-end gap-1 border border-border/60 px-2 py-2">
        {points.map((point, index) => {
          const height = Math.max(4, Math.round((Math.abs(point.value) / max) * 100))
          return (
            <div
              key={`${point.date}-${index}`}
              className={point.value >= 0 ? 'flex-1 bg-foreground' : 'flex-1 bg-muted'}
              style={{ height: `${height}%` }}
              title={`${point.date}: ${formatAnalyticsValue(point.value)}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function AnalyticsDialogBody({
  analytics,
  loading,
  error
}: {
  analytics: AccountAnalytics | null
  loading: boolean
  error: string | null
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center border border-border/60">
        <Spinner size="sm" label="加载数据..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 border border-border/60 px-4 text-center">
        <span className="text-sm">加载失败</span>
        <span className="text-xs text-muted-foreground">{error}</span>
      </div>
    )
  }

  const metrics = ANALYTICS_METRIC_LABELS.flatMap(({ key, label }) => {
    const value = analytics?.overview[key]
    return typeof value === 'number' && Number.isFinite(value) ? [{ key, label, value }] : []
  })
  const fansTrend = analytics?.fansTrend ?? []

  if (metrics.length === 0 && fansTrend.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center border border-border/60 text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 border border-border/60 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.key} className="border-b border-r border-border/60 p-3 last:border-r-0">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-1 text-lg tabular-nums">{formatAnalyticsValue(metric.value)}</div>
            </div>
          ))}
        </div>
      )}
      <AnalyticsSparkline points={fansTrend} />
      {analytics?.updatedAt && (
        <div className="text-xs text-muted-foreground">
          更新于 {new Date(analytics.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}

type InteractionTab = 'comments' | 'dms'

function formatInteractionTime(timestamp: number | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleString()
}

function InteractionStateBox({
  label,
  detail,
  loading
}: {
  label: string
  detail?: string | null
  loading?: boolean
}): React.ReactElement {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
      {loading && <Spinner size="sm" label={label} />}
      {!loading && <span>{label}</span>}
      {!loading && detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  )
}

function CommentsPane({
  account,
  active
}: {
  account: Account
  active: boolean
}): React.ReactElement {
  const [posts, setPosts] = useState<AccountPost[]>([])
  const [selectedPostId, setSelectedPostId] = useState('')
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [comments, setComments] = useState<AccountComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<AccountComment | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const loadPosts = useCallback(async () => {
    setPostsLoading(true)
    setPostsError(null)
    try {
      const result = await window.api.account.listPosts(account.id)
      setPosts(result)
      setPostsLoaded(true)
      setSelectedPostId((current) => current || result[0]?.id || '')
    } catch (error) {
      console.error('Failed to load account posts:', error)
      setPostsError(error instanceof Error ? error.message : '无法加载作品')
      setPostsLoaded(true)
    } finally {
      setPostsLoading(false)
    }
  }, [account.id])

  const loadComments = useCallback(
    async (postId: string) => {
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const result = await window.api.account.listComments(account.id, postId)
        setComments(result)
      } catch (error) {
        console.error('Failed to load account comments:', error)
        setCommentsError(error instanceof Error ? error.message : '无法加载评论')
      } finally {
        setCommentsLoading(false)
      }
    },
    [account.id]
  )

  useEffect(() => {
    if (active && !postsLoaded) {
      void loadPosts()
    }
  }, [active, postsLoaded, loadPosts])

  useEffect(() => {
    if (active && selectedPostId) {
      void loadComments(selectedPostId)
    }
  }, [active, selectedPostId, loadComments])

  const selectedPost = posts.find((post) => post.id === selectedPostId)

  const handleReply = async (): Promise<void> => {
    const content = replyText.trim()
    if (!selectedPostId || !replyingTo || !content) return

    setReplySubmitting(true)
    try {
      const created = await window.api.account.replyComment(
        account.id,
        selectedPostId,
        content,
        replyingTo.id
      )
      if (!created) {
        throw new Error('平台未返回成功结果')
      }
      setReplyingTo(null)
      setReplyText('')
      await loadComments(selectedPostId)
      toast('回复已发送')
    } catch (error) {
      console.error('Failed to reply account comment:', error)
      toast.error('回复失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    } finally {
      setReplySubmitting(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-3 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
      <div className="flex min-h-0 flex-col border border-border/60">
        <div className="border-b border-border/60 px-3 py-2 text-sm">作品</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {postsLoading ? (
            <InteractionStateBox label="加载作品..." loading />
          ) : postsError ? (
            <InteractionStateBox label="作品加载失败" detail={postsError} />
          ) : posts.length === 0 ? (
            <InteractionStateBox label="暂无可选作品" />
          ) : (
            <div className="divide-y divide-border/60">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={`flex w-full flex-col gap-1 px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.03] ${
                    selectedPostId === post.id ? 'bg-foreground/[0.05]' : ''
                  }`}
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                    setSelectedPostId(post.id)
                  }}
                >
                  <span className="line-clamp-2">{post.title || post.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {post.commentCount !== undefined
                      ? `${post.commentCount.toLocaleString()} 评论`
                      : post.id}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col border border-border/60">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm">{selectedPost?.title || selectedPostId || '评论'}</div>
            {selectedPost?.createdAt && (
              <div className="text-xs text-muted-foreground">
                {formatInteractionTime(selectedPost.createdAt)}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="font-normal"
            onClick={() => selectedPostId && void loadComments(selectedPostId)}
            disabled={!selectedPostId || commentsLoading}
          >
            <RefreshCw />
            刷新
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!selectedPostId ? (
            <InteractionStateBox label="请选择作品" />
          ) : commentsLoading ? (
            <InteractionStateBox label="加载评论..." loading />
          ) : commentsError ? (
            <InteractionStateBox label="评论加载失败" detail={commentsError} />
          ) : comments.length === 0 ? (
            <InteractionStateBox label="暂无评论" />
          ) : (
            <div className="divide-y divide-border/60">
              {comments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-2 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{comment.author || '匿名用户'}</div>
                      {comment.createdAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatInteractionTime(comment.createdAt)}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs font-normal"
                      onClick={() => {
                        setReplyingTo(comment)
                        setReplyText('')
                      }}
                    >
                      <Reply />
                      回复
                    </Button>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {comment.content || '无内容'}
                  </div>
                  {comment.replyCount !== undefined && comment.replyCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {comment.replyCount.toLocaleString()} 条回复
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {replyingTo && (
          <div className="border-t border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">回复 {replyingTo.author || replyingTo.id}</span>
              <button
                type="button"
                className="shrink-0 hover:text-foreground"
                onClick={() => {
                  setReplyingTo(null)
                  setReplyText('')
                }}
              >
                取消
              </button>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="输入回复"
                className="min-h-10 flex-1 resize-none rounded-md border border-border/60 bg-transparent"
              />
              <Button
                size="sm"
                variant="secondary"
                className="self-end font-normal"
                onClick={() => void handleReply()}
                isLoading={replySubmitting}
                disabled={!replyText.trim()}
              >
                {!replySubmitting && <Send />}
                发送
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DmPane({
  account,
  active
}: {
  account: Account
  active: boolean
}): React.ReactElement {
  const [sessions, setSessions] = useState<DmSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [sendText, setSendText] = useState('')
  const [sendSubmitting, setSendSubmitting] = useState(false)

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError(null)
    try {
      const result = await window.api.account.listDmSessions(account.id)
      setSessions(result)
      setSessionsLoaded(true)
      setSelectedSessionId((current) => current || result[0]?.id || '')
    } catch (error) {
      console.error('Failed to load account DM sessions:', error)
      setSessionsError(error instanceof Error ? error.message : '无法加载会话')
      setSessionsLoaded(true)
    } finally {
      setSessionsLoading(false)
    }
  }, [account.id])

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setMessagesLoading(true)
      setMessagesError(null)
      try {
        const result = await window.api.account.listDmMessages(account.id, sessionId)
        setMessages(result)
      } catch (error) {
        console.error('Failed to load account DM messages:', error)
        setMessagesError(error instanceof Error ? error.message : '无法加载消息')
      } finally {
        setMessagesLoading(false)
      }
    },
    [account.id]
  )

  useEffect(() => {
    if (active && !sessionsLoaded) {
      void loadSessions()
    }
  }, [active, sessionsLoaded, loadSessions])

  useEffect(() => {
    if (active && selectedSessionId) {
      void loadMessages(selectedSessionId)
    }
  }, [active, selectedSessionId, loadMessages])

  const selectedSession = sessions.find((session) => session.id === selectedSessionId)

  const handleSend = async (): Promise<void> => {
    const text = sendText.trim()
    if (!selectedSession || !text) return

    setSendSubmitting(true)
    try {
      const sent = await window.api.account.sendDm(
        account.id,
        selectedSession.id,
        selectedSession.peerUsername || selectedSession.id,
        text
      )
      if (!sent) {
        throw new Error('平台未返回成功结果')
      }
      setMessages((current) => [...current, sent])
      setSendText('')
      toast('私信已发送')
    } catch (error) {
      console.error('Failed to send account DM:', error)
      toast.error('发送失败', {
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    } finally {
      setSendSubmitting(false)
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-3 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
      <div className="flex min-h-0 flex-col border border-border/60">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <span className="text-sm">会话</span>
          <Button
            size="icon-sm"
            variant="ghost"
            className="font-normal"
            aria-label="刷新会话"
            onClick={() => void loadSessions()}
            disabled={sessionsLoading}
          >
            <RefreshCw />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sessionsLoading ? (
            <InteractionStateBox label="加载会话..." loading />
          ) : sessionsError ? (
            <InteractionStateBox label="会话加载失败" detail={sessionsError} />
          ) : sessions.length === 0 ? (
            <InteractionStateBox label="暂无会话" />
          ) : (
            <div className="divide-y divide-border/60">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`flex w-full flex-col gap-1 px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.03] ${
                    selectedSessionId === session.id ? 'bg-foreground/[0.05]' : ''
                  }`}
                  onClick={() => {
                    setSendText('')
                    setSelectedSessionId(session.id)
                  }}
                >
                  <span className="truncate">
                    {session.peerName || session.peerUsername || session.id}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {session.lastMessage || '暂无文本消息'}
                  </span>
                  {session.lastTime && (
                    <span className="text-xs text-muted-foreground">
                      {formatInteractionTime(session.lastTime)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col border border-border/60">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm">
              {selectedSession?.peerName || selectedSession?.peerUsername || '私信'}
            </div>
            {selectedSession?.lastTime && (
              <div className="text-xs text-muted-foreground">
                {formatInteractionTime(selectedSession.lastTime)}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="font-normal"
            onClick={() => selectedSessionId && void loadMessages(selectedSessionId)}
            disabled={!selectedSessionId || messagesLoading}
          >
            <RefreshCw />
            刷新
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {!selectedSessionId ? (
            <InteractionStateBox label="请选择会话" />
          ) : messagesLoading ? (
            <InteractionStateBox label="加载消息..." loading />
          ) : messagesError ? (
            <InteractionStateBox label="消息加载失败" detail={messagesError} />
          ) : messages.length === 0 ? (
            <InteractionStateBox label="暂无消息" />
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] border border-border/60 px-3 py-2 text-sm leading-relaxed ${
                      message.fromMe ? 'bg-foreground text-background' : 'bg-transparent'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.text || '非文本消息'}
                    </div>
                    {message.createdAt && (
                      <div
                        className={`mt-1 text-[11px] ${
                          message.fromMe ? 'text-background/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatInteractionTime(message.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedSession && (
          <div className="border-t border-border/60 p-3">
            <div className="flex gap-2">
              <Textarea
                value={sendText}
                onChange={(event) => setSendText(event.target.value)}
                placeholder="输入私信"
                className="min-h-10 flex-1 resize-none rounded-md border border-border/60 bg-transparent"
              />
              <Button
                size="sm"
                variant="secondary"
                className="self-end font-normal"
                onClick={() => void handleSend()}
                isLoading={sendSubmitting}
                disabled={!sendText.trim()}
              >
                {!sendSubmitting && <Send />}
                发送
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AccountInteractionsDialog({
  account,
  onOpenChange
}: {
  account: Account | null
  onOpenChange: (open: boolean) => void
}): React.ReactElement {
  const [tab, setTab] = useState<InteractionTab>('comments')
  const open = account !== null

  useEffect(() => {
    if (!open) {
      setTab('comments')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] max-h-[80vh] w-[calc(100vw-2rem)] max-w-[960px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>账号互动</DialogTitle>
          <DialogDescription>
            {account
              ? `${getAccountLabel(account)} · ${PLATFORMS[account.platform]?.name || account.platform}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {account && (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as InteractionTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="border border-border/60 bg-transparent p-0">
              <TabsTrigger
                value="comments"
                className="gap-1.5 font-normal data-[state=active]:text-foreground"
              >
                <MessageCircle className="size-3.5" />
                评论
              </TabsTrigger>
              <TabsTrigger
                value="dms"
                className="gap-1.5 font-normal data-[state=active]:text-foreground"
              >
                <MessageSquare className="size-3.5" />
                私信
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="comments"
              className="mt-3 min-h-0 flex-1 data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <CommentsPane account={account} active={open && tab === 'comments'} />
            </TabsContent>
            <TabsContent
              value="dms"
              className="mt-3 min-h-0 flex-1 data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <DmPane account={account} active={open && tab === 'dms'} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AccountsPage({ onLoginAccount }: AccountsPageProps): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [proxies, setProxies] = useState<ProxyProfile[]>([])
  const [proxySettings, setProxySettings] = useState<ProxySettings>({
    defaultProxyId: null,
    globalProxyId: null
  })
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false)
  const [proxyDialogTarget, setProxyDialogTarget] = useState<'new-account' | 'edit-account' | null>(
    null
  )

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | ''>('')
  const [platformSearch, setPlatformSearch] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('ALL')
  const [newAccountProxyId, setNewAccountProxyId] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editProxyId, setEditProxyId] = useState<string | null>(null)

  // Destructive actions go through a confirm dialog (deleting an account also
  // clears its login session, so it must never be one accidental click away).
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<AccountGroup | null>(null)
  const [analyticsAccount, setAnalyticsAccount] = useState<Account | null>(null)
  const [accountAnalytics, setAccountAnalytics] = useState<AccountAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [interactionsAccount, setInteractionsAccount] = useState<Account | null>(null)

  // List filters (platform rail + toolbar), modeled after mature account managers
  const [platformFilter, setPlatformFilter] = useState<PlatformType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [accountSearch, setAccountSearch] = useState('')
  const [railSearch, setRailSearch] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [accountsData, groupsData, proxyList, settings] = await Promise.all([
        window.api.account.list(selectedGroup ? { groupId: selectedGroup } : undefined),
        window.api.group.list(),
        window.api.proxy.list(),
        window.api.proxy.getSettings()
      ])
      setAccounts(accountsData)
      setGroups(groupsData)
      setProxies(proxyList)
      setProxySettings(settings)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('无法加载账号列表', { description: '请稍后重试，若持续失败请重启应用' })
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshProxyData = useCallback(async (): Promise<ProxyProfile[]> => {
    const [proxyList, settings] = await Promise.all([
      window.api.proxy.list(),
      window.api.proxy.getSettings()
    ])
    setProxies(proxyList)
    setProxySettings(settings)
    return proxyList
  }, [])

  // The main process re-detects accounts in the background (e.g. right after
  // a login tab closes); merge those updates into the list live.
  useEffect(() => {
    return window.api.account.onUpdated((updated) => {
      setAccounts((prev) =>
        prev.map((account) => (account.id === updated.id ? updated : account))
      )
    })
  }, [])

  useEffect(() => {
    if (!analyticsAccount) return

    let cancelled = false
    setAccountAnalytics(null)
    setAnalyticsError(null)
    setAnalyticsLoading(true)

    window.api.account
      .getAnalytics(analyticsAccount.id)
      .then((analytics) => {
        if (!cancelled) {
          setAccountAnalytics(analytics)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load account analytics:', error)
          setAnalyticsError(error instanceof Error ? error.message : '无法加载账号数据')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnalyticsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [analyticsAccount])

  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [refreshAllProgress, setRefreshAllProgress] = useState({ done: 0, total: 0 })

  const handleRefreshAccount = useCallback(async (account: Account) => {
    setRefreshingIds((prev) => new Set(prev).add(account.id))
    try {
      const updated = await window.api.account.refreshInfo(account.id)
      if (updated) {
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        if (updated.isLoggedIn) {
          toast(`已更新 ${updated.displayName || updated.username} 的账号信息`)
        } else {
          toast('未检测到登录', { description: '点击「去登录」完成平台登录' })
        }
      }
    } catch (error) {
      console.error('Failed to refresh account info:', error)
      toast.error('检测失败', {
        description: `${error instanceof Error ? error.message : '无法检测账号状态'}，请稍后重试`
      })
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev)
        next.delete(account.id)
        return next
      })
    }
  }, [])

  const handleRefreshAll = useCallback(async () => {
    if (accounts.length === 0) return
    setIsRefreshingAll(true)
    setRefreshAllProgress({ done: 0, total: accounts.length })
    try {
      const results = await Promise.allSettled(
        accounts.map((account) =>
          window.api.account.refreshInfo(account.id).finally(() => {
            setRefreshAllProgress((prev) => ({ ...prev, done: prev.done + 1 }))
          })
        )
      )
      const updatedAccounts = results
        .filter(
          (result): result is PromiseFulfilledResult<Account | null> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)
        .filter((account): account is Account => Boolean(account))
      const failedCount = results.filter((result) => result.status === 'rejected').length

      setAccounts((prev) =>
        prev.map((account) => updatedAccounts.find((u) => u.id === account.id) || account)
      )
      const loggedIn = updatedAccounts.filter((account) => account.isLoggedIn).length
      toast(failedCount > 0 ? '检测完成（部分失败）' : '检测完成', {
        description:
          `共 ${accounts.length} 个账号，${loggedIn} 个在线` +
          (failedCount > 0 ? `，${failedCount} 个检测失败，可稍后重试` : '')
      })
    } catch (error) {
      console.error('Failed to refresh all accounts:', error)
      toast.error('检测没能完成', { description: '稍后重试一下。' })
    } finally {
      setIsRefreshingAll(false)
    }
  }, [accounts])

  const resetAddAccountForm = () => {
    setSelectedPlatform('')
    setPlatformSearch('')
    setContentTypeFilter('ALL')
    setNewAccountProxyId(getSelectableProxyId(proxySettings.defaultProxyId, proxies))
  }

  const openAddAccountModal = () => {
    setNewAccountProxyId(getSelectableProxyId(proxySettings.defaultProxyId, proxies))
    setIsAddAccountOpen(true)
  }

  const closeAddAccountModal = () => {
    setIsAddAccountOpen(false)
    resetAddAccountForm()
  }

  // keepOpen keeps the dialog (and the platform selection) around so several
  // accounts of the same platform can be added back-to-back.
  const handleAddAccount = async (keepOpen: boolean) => {
    if (!selectedPlatform) return

    try {
      const proxyId = getSelectableProxyId(newAccountProxyId, proxies)
      const account = await window.api.account.create(selectedPlatform, {
        proxyId
      })
      setAccounts((prev) => [account, ...prev])
      if (!keepOpen) {
        closeAddAccountModal()
      }
      toast(`已添加 ${PLATFORMS[selectedPlatform]?.name || selectedPlatform} 账号`, {
        description: keepOpen ? '可以继续添加下一个账号' : undefined
      })
    } catch (error) {
      console.error('Failed to add account:', error)
      toast.error('无法添加账号', { description: '请重试，若持续失败请重启应用' })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await window.api.account.delete(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      toast('账号已删除')
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast.error('无法删除账号', { description: '请稍后重试' })
    }
  }

  const handleSetDefault = async (account: Account) => {
    try {
      await window.api.account.setDefault(account.id, account.platform)
      await loadData()
      toast(`已将 ${account.displayName || account.username} 设为默认账号`)
    } catch (error) {
      console.error('Failed to set default:', error)
      toast.error('没能设为默认', { description: '稍后重试一下。' })
    }
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      const group = await window.api.group.create({
        name: newGroupName.trim(),
        color: newGroupColor || undefined
      })
      setGroups((prev) => [...prev, group])
      setIsAddGroupOpen(false)
      setNewGroupName('')
      setNewGroupColor('')
      toast(`分组「${group.name}」已创建`)
    } catch (error) {
      console.error('Failed to add group:', error)
      toast.error('无法创建分组', { description: '请稍后重试' })
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await window.api.group.delete(id)
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroup === id) {
        setSelectedGroup(null)
      }
      toast('分组已删除')
    } catch (error) {
      console.error('Failed to delete group:', error)
      toast.error('无法删除分组', { description: '请稍后重试' })
    }
  }

  const handleAssignGroup = async (accountId: string, groupId: string | null) => {
    try {
      await window.api.account.update(accountId, { groupId: groupId || undefined })
      await loadData()
      const groupName = groupId ? groups.find((g) => g.id === groupId)?.name : null
      toast(groupName ? `已移到分组「${groupName}」` : '已移出分组')
    } catch (error) {
      console.error('Failed to assign group:', error)
      toast.error('分组没改成', { description: '稍后重试一下。' })
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setEditDisplayName(account.displayName || account.username || '')
    setEditProxyId(getSelectableProxyId(account.proxyId, proxies))
    setIsEditAccountOpen(true)
  }

  const handleSaveAccountName = async () => {
    if (!editingAccount) return

    try {
      const proxyId = getSelectableProxyId(editProxyId, proxies)
      await window.api.account.update(editingAccount.id, {
        displayName: editDisplayName.trim() || undefined,
        proxyId: proxyId ?? null
      })
      await loadData()
      setIsEditAccountOpen(false)
      setEditingAccount(null)
      toast('账号信息已保存')
    } catch (error) {
      console.error('Failed to update account name:', error)
      toast.error('无法保存账号信息', { description: '请稍后重试' })
    }
  }

  const accountStats = useMemo(() => {
    const loggedInCount = accounts.filter((account) => account.isLoggedIn).length
    const platformCount = new Set(accounts.map((account) => account.platform)).size

    return {
      total: accounts.length,
      loggedIn: loggedInCount,
      platformCount,
      groups: groups.length
    }
  }, [accounts, groups])

  const filteredPlatformsByCategory = useMemo(() => {
    const query = platformSearch.trim().toLowerCase()
    const allPlatformIds = Object.keys(PLATFORMS) as PlatformType[]

    const visiblePlatformIds = allPlatformIds.filter((platform) => {
      const platformInfo = PLATFORMS[platform]
      const contentTypes = getPlatformContentTypes(platform)
      const accountKey = getPlatformAccountKey(platform)
      const matchesContentType =
        contentTypeFilter === 'ALL' || contentTypes.includes(contentTypeFilter)
      const matchesQuery =
        !query ||
        platformInfo.name.toLowerCase().includes(query) ||
        platform.toLowerCase().includes(query) ||
        accountKey.toLowerCase().includes(query)

      return matchesContentType && matchesQuery
    })

    const categorized = PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((platform) => visiblePlatformIds.includes(platform))
    })).filter((category) => category.platforms.length > 0)

    const categorizedIds = new Set(categorized.flatMap((category) => category.platforms))
    const otherPlatforms = visiblePlatformIds.filter((platform) => !categorizedIds.has(platform))

    if (otherPlatforms.length > 0) {
      categorized.push({
        id: 'other',
        name: '其他平台',
        platforms: otherPlatforms
      })
    }

    return categorized
  }, [contentTypeFilter, platformSearch])

  // Platforms that actually have accounts, with counts, for the left rail
  const platformEntries = useMemo(() => {
    const counts = new Map<PlatformType, number>()
    for (const account of accounts) {
      counts.set(account.platform, (counts.get(account.platform) || 0) + 1)
    }
    const query = railSearch.trim().toLowerCase()
    return Array.from(counts.entries())
      .map(([platform, count]) => ({
        platform,
        count,
        name: PLATFORMS[platform]?.name || platform
      }))
      .filter(
        (entry) =>
          !query ||
          entry.name.toLowerCase().includes(query) ||
          entry.platform.toLowerCase().includes(query)
      )
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }, [accounts, railSearch])

  const visibleAccounts = useMemo(() => {
    const query = accountSearch.trim().toLowerCase()
    return accounts.filter((account) => {
      if (platformFilter !== 'all' && account.platform !== platformFilter) return false
      if (statusFilter === 'online' && !account.isLoggedIn) return false
      if (statusFilter === 'offline' && account.isLoggedIn) return false
      if (query) {
        const label = getAccountLabel(account).toLowerCase()
        const username = (account.username || '').toLowerCase()
        if (!label.includes(query) && !username.includes(query)) return false
      }
      return true
    })
  }, [accounts, platformFilter, statusFilter, accountSearch])

  const groupSelectOptions = useMemo(
    () => [
      { value: UNGROUPED_VALUE, label: '未分组' },
      ...groups.map((g) => ({ value: g.id, label: g.name }))
    ],
    [groups]
  )

  const proxySelectOptions = useMemo(
    () => [
      { value: PROXY_NONE_VALUE, label: '无代理' },
      ...proxies.map((proxy) => ({ value: proxy.id, label: formatProxyOption(proxy) })),
      { value: PROXY_CREATE_VALUE, label: '+ 新建代理…' }
    ],
    [proxies]
  )

  const handleNewAccountProxyChange = (value: string): void => {
    if (value === PROXY_CREATE_VALUE) {
      setProxyDialogTarget('new-account')
      return
    }
    setNewAccountProxyId(value === PROXY_NONE_VALUE ? null : value)
  }

  const handleEditProxyChange = (value: string): void => {
    if (value === PROXY_CREATE_VALUE) {
      setProxyDialogTarget('edit-account')
      return
    }
    setEditProxyId(value === PROXY_NONE_VALUE ? null : value)
  }

  const handleProxyCreated = async (profile: ProxyProfile): Promise<void> => {
    try {
      await refreshProxyData()
    } catch (error) {
      console.error('Failed to refresh proxy list:', error)
      toast.error('代理已创建，但列表刷新失败', { description: '请稍后手动刷新页面' })
    }

    if (proxyDialogTarget === 'new-account') {
      setNewAccountProxyId(profile.id)
    } else if (proxyDialogTarget === 'edit-account') {
      setEditProxyId(profile.id)
    }
    setProxyDialogTarget(null)
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* 左侧：平台 / 分组筛选栏（坐画布上，靠填充态与右侧软表面自然分界） */}
      <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto md:flex">
        <SearchInput value={railSearch} onChange={setRailSearch} placeholder="搜索平台" />

        <div className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">平台</span>
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
              platformFilter === 'all'
                ? 'bg-card font-medium'
                : 'hover:bg-foreground/[0.03]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              全部平台
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{accounts.length}</span>
          </button>
          {platformEntries.map((entry) => (
            <button
              key={entry.platform}
              type="button"
              onClick={() => setPlatformFilter(entry.platform)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                platformFilter === entry.platform
                  ? 'bg-card font-medium'
                  : 'hover:bg-foreground/[0.03]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <PlatformIcon platform={entry.platform} size={16} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{entry.count}</span>
            </button>
          ))}
          {platformEntries.length === 0 && accounts.length > 0 && (
            <span className="px-2.5 py-2 text-xs text-muted-foreground">没有匹配的平台</span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between px-2.5 pb-1">
            <span className="text-xs font-medium text-muted-foreground">分组</span>
            <Tooltip content="新建分组">
              <button
                type="button"
                onClick={() => setIsAddGroupOpen(true)}
                aria-label="新建分组"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <FolderPlus className="size-3.5" />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={() => setSelectedGroup(null)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              selectedGroup === null
                ? 'bg-card font-medium'
                : 'hover:bg-foreground/[0.03]'
            }`}
          >
            全部分组
          </button>
          {groups.map((group) => (
            <div
              key={group.id}
              className={`group flex items-center rounded-lg transition-colors ${
                selectedGroup === group.id ? 'bg-card' : 'hover:bg-foreground/[0.03]'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedGroup(group.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm ${
                  selectedGroup === group.id ? 'font-medium' : ''
                }`}
              >
                {group.color && (
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                )}
                <span className="truncate">{group.name}</span>
              </button>
              <button
                type="button"
                className="mr-1.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-foreground/[0.08] group-hover:opacity-100"
                onClick={() => setGroupToDelete(group)}
                aria-label={`删除分组 ${group.name}`}
                title="删除分组"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {groups.length === 0 && (
            <span className="px-2.5 py-1 text-xs text-muted-foreground">暂无分组</span>
          )}
        </div>
      </aside>

      {/* 主区：工具栏 + 账号列表 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">账号管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {accountStats.total} 个账号 · {accountStats.loggedIn} 个已登录 ·{' '}
            {accountStats.platformCount} 个平台
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SimpleSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value as StatusFilter) || 'all')}
            options={STATUS_FILTERS.map((filter) => ({ value: filter.key, label: filter.label }))}
            className="h-8 w-32 shrink-0 text-xs"
          />
          <SearchInput
            value={accountSearch}
            onChange={setAccountSearch}
            placeholder="搜索账号名称"
            className="w-56"
          />
          <div className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefreshAll}
            isLoading={isRefreshingAll}
            disabled={accounts.length === 0}
          >
            {!isRefreshingAll && <RefreshCw />}
            {isRefreshingAll
              ? `检测中 ${refreshAllProgress.done}/${refreshAllProgress.total}`
              : '检测全部'}
          </Button>
          <Button size="sm" onClick={openAddAccountModal}>
            <Plus />
            添加账号
          </Button>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-xl bg-muted">
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-xl bg-muted">
            <div className="flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground">
              <Users className="size-7" />
            </div>
            <div className="text-center">
              <p className="font-medium">暂无账号</p>
              <p className="text-sm text-muted-foreground">选择平台后会创建独立登录会话</p>
            </div>
            <Button size="sm" onClick={openAddAccountModal}>
              <Plus />
              添加第一个账号
            </Button>
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground">
            <Search className="size-7" />
            <span className="text-sm">没有匹配的账号，试试调整筛选条件</span>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border/60">
              <div className="hidden items-center gap-3 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_252px] lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_160px_252px]">
                <span>账号信息</span>
                <span>平台</span>
                <span className="hidden lg:inline">分组</span>
                <span className="text-right">操作</span>
              </div>
              {visibleAccounts.map((account) => {
                const platformInfo = PLATFORMS[account.platform]
                const accountLabel = getAccountLabel(account)
                const statsLabel = formatAccountStats(account.stats)
                const healthBadge = account.isLoggedIn
                  ? formatAccountHealthBadge(account.health)
                  : null
                const canViewAnalytics =
                  account.isLoggedIn && supportsAccountAnalytics(account.platform)
                const canViewInteractions =
                  account.isLoggedIn && account.platform === 'weixinchannel'

                return (
                  <div
                    key={account.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_252px] lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_160px_252px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AccountAvatar
                        avatar={account.avatar}
                        platform={account.platform}
                        size={40}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            className="truncate text-left text-sm font-medium hover:underline"
                            onClick={() => handleEditAccount(account)}
                            title="点击编辑名称"
                          >
                            {accountLabel}
                          </button>
                          {account.isDefault && (
                            <Badge size="sm" className="shrink-0">
                              默认
                            </Badge>
                          )}
                        </div>
                        {statsLabel && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {statsLabel}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          {account.isLoggedIn ? (
                            <span className="inline-flex items-center gap-1 text-xs text-foreground">
                              <CheckCircle className="size-3.5" />
                              已登录
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <XCircle className="size-3.5" />
                              未登录
                            </span>
                          )}
                          {healthBadge && (
                            <Badge
                              variant="outline"
                              size="sm"
                              className="max-w-[160px] shrink truncate text-destructive"
                              title={healthBadge}
                            >
                              {healthBadge}
                            </Badge>
                          )}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                            onClick={() => onLoginAccount?.(account)}
                          >
                            <LogIn className="size-3" />
                            {account.isLoggedIn ? '重新登录' : '去登录'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 次要列：窄窗时隐藏，信息收缩进首列 */}
                    <div className="hidden min-w-0 items-center gap-2 md:flex">
                      <PlatformIcon platform={account.platform} size={18} />
                      <span className="truncate text-sm">
                        {platformInfo?.name || account.platform}
                      </span>
                    </div>

                    <div className="hidden lg:block">
                      <SimpleSelect
                        value={account.groupId || UNGROUPED_VALUE}
                        onValueChange={(value) =>
                          handleAssignGroup(account.id, value === UNGROUPED_VALUE ? null : value)
                        }
                        options={groupSelectOptions}
                        placeholder="未分组"
                        className="h-8 w-full text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-0.5">
                      {canViewInteractions && (
                        <Tooltip content="账号互动">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-normal"
                            aria-label="账号互动"
                            onClick={() => setInteractionsAccount(account)}
                          >
                            <MessageCircle />
                            互动
                          </Button>
                        </Tooltip>
                      )}
                      {canViewAnalytics && (
                        <Tooltip content="查看账号数据">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-normal"
                            aria-label="查看账号数据"
                            onClick={() => setAnalyticsAccount(account)}
                          >
                            <BarChart3 />
                            数据
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip content="检测登录状态">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="检测登录状态"
                          onClick={() => handleRefreshAccount(account)}
                          isLoading={refreshingIds.has(account.id)}
                        >
                          {!refreshingIds.has(account.id) && <RefreshCw />}
                        </Button>
                      </Tooltip>
                      {!account.isDefault && (
                        <Tooltip content="设为默认">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="设为默认"
                            onClick={() => handleSetDefault(account)}
                          >
                            <Star />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip content="编辑账号">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="编辑账号"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip content="删除账号">
                        <Button
                          size="icon-sm"
                          variant="destructive-ghost"
                          aria-label="删除账号"
                          onClick={() => setAccountToDelete(account)}
                        >
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Account Analytics Dialog */}
        <Dialog
          open={analyticsAccount !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAnalyticsAccount(null)
              setAccountAnalytics(null)
              setAnalyticsError(null)
            }
          }}
        >
          <DialogContent className="max-w-[560px]">
            <DialogHeader>
              <DialogTitle>账号数据</DialogTitle>
              <DialogDescription>
                {analyticsAccount
                  ? `${getAccountLabel(analyticsAccount)} · ${
                      PLATFORMS[analyticsAccount.platform]?.name || analyticsAccount.platform
                    }`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <AnalyticsDialogBody
              analytics={accountAnalytics}
              loading={analyticsLoading}
              error={analyticsError}
            />
          </DialogContent>
        </Dialog>

        <AccountInteractionsDialog
          account={interactionsAccount}
          onOpenChange={(open) => {
            if (!open) setInteractionsAccount(null)
          }}
        />

        {/* Add Account Dialog */}
        <Dialog
          open={isAddAccountOpen}
          onOpenChange={(open) => {
            if (!open) closeAddAccountModal()
          }}
        >
          <DialogContent className="max-w-[920px]">
            <DialogHeader>
              <DialogTitle>添加账号</DialogTitle>
              <DialogDescription>选择账号平台，并从代理池中选择账号代理</DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[60vh] min-h-0 flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput
                  value={platformSearch}
                  onChange={setPlatformSearch}
                  placeholder="搜索平台或账号"
                  className="lg:w-72"
                />
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPE_FILTERS.map((filter) => (
                    <Button
                      key={filter.key}
                      size="sm"
                      variant={contentTypeFilter === filter.key ? 'default' : 'secondary'}
                      onClick={() => setContentTypeFilter(filter.key)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-foreground/[0.03] p-3">
                {filteredPlatformsByCategory.length === 0 ? (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Search className="size-8" />
                    <span className="text-sm">没有匹配的平台</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {filteredPlatformsByCategory.map((category) => (
                      <div key={category.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {category.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {category.platforms.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {category.platforms.map((platform) => {
                            const platformInfo = PLATFORMS[platform]
                            const isSelected = selectedPlatform === platform
                            const accountKey = getPlatformAccountKey(platform)

                            return (
                              <button
                                key={platform}
                                type="button"
                                onClick={() => setSelectedPlatform(platform)}
                                className={`flex flex-col gap-2 rounded-lg p-3 text-left transition-colors ${
                                  isSelected ? 'bg-card' : 'hover:bg-card/60'
                                }`}
                              >
                                <div className="flex w-full items-center justify-between gap-2">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <PlatformIcon platform={platform} size={20} />
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="size-4 shrink-0 text-foreground" />
                                  )}
                                </div>
                                <div className="w-full min-w-0">
                                  <span className="block truncate text-sm font-medium">
                                    {platformInfo?.name || platform}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {accountKey}
                                  </span>
                                </div>
                                <PlatformContentBadges platform={platform} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SimpleSelect
                label="代理"
                description="默认使用代理页设置的默认代理；也可以改为无代理或新建代理。"
                value={newAccountProxyId ?? PROXY_NONE_VALUE}
                options={proxySelectOptions}
                onValueChange={handleNewAccountProxyChange}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeAddAccountModal}>
                取消
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleAddAccount(true)}
                disabled={!selectedPlatform}
              >
                添加并继续
              </Button>
              <Button onClick={() => handleAddAccount(false)} disabled={!selectedPlatform}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Group Dialog */}
        <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建分组</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="分组名称"
                placeholder="输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                type="color"
                label="分组颜色（可选）"
                className="w-16 p-1"
                value={newGroupColor || '#a3a3a3'}
                onChange={(e) => setNewGroupColor(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddGroupOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑账号</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="显示名称"
                placeholder="输入账号显示名称"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                autoFocus
              />
              <SimpleSelect
                label="代理"
                description="账号流量只使用这里选择的代理；无代理时直连。"
                value={editProxyId ?? PROXY_NONE_VALUE}
                options={proxySelectOptions}
                onValueChange={handleEditProxyChange}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditAccountOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveAccountName}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProxyProfileFormDialog
          open={proxyDialogTarget !== null}
          onOpenChange={(open) => {
            if (!open) setProxyDialogTarget(null)
          }}
          onSaved={handleProxyCreated}
        />

        {/* Delete account confirm */}
        <ConfirmDialog
          open={accountToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setAccountToDelete(null)
          }}
          title={`删除账号「${accountToDelete ? getAccountLabel(accountToDelete) : ''}」？`}
          description="将同时清除该账号的登录会话，删除后需重新登录。"
          confirmText="删除"
          onConfirm={async () => {
            if (accountToDelete) await handleDeleteAccount(accountToDelete.id)
          }}
        />

        {/* Delete group confirm */}
        <ConfirmDialog
          open={groupToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setGroupToDelete(null)
          }}
          title={`删除分组「${groupToDelete?.name || ''}」？`}
          description="组内账号不会被删除，会变为未分组。"
          confirmText="删除"
          onConfirm={async () => {
            if (groupToDelete) await handleDeleteGroup(groupToDelete.id)
          }}
        />
      </div>
    </div>
  )
}
