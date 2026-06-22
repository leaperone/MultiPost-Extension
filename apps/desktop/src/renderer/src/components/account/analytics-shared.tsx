import { isAnalyticsSupported, type Account, type AccountAnalytics, type AccountHealthStatus, type AccountStats, type PlatformType } from '@shared/types'

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

export interface AnalyticsMetricItem {
  key: keyof AccountAnalytics['overview']
  label: string
  value: number
}

export function getAccountLabel(account: Account): string {
  return account.displayName || account.username || '未命名账号'
}

export function supportsAccountAnalytics(platform: PlatformType): boolean {
  return isAnalyticsSupported(platform)
}

export function formatAccountStats(stats: AccountStats | undefined): string | null {
  if (!stats) return null

  const labels: Array<{
    key: keyof Pick<AccountStats, 'fans' | 'following' | 'likes' | 'works' | 'views'>
    label: string
  }> = [
    { key: 'fans', label: '粉丝' },
    { key: 'following', label: '关注' },
    { key: 'likes', label: '获赞' },
    { key: 'works', label: '作品' },
    { key: 'views', label: '播放' }
  ]

  const parts = labels.flatMap(({ key, label }) => {
    const value = stats[key]
    return typeof value === 'number' && Number.isFinite(value)
      ? [`${value.toLocaleString()} ${label}`]
      : []
  })

  return parts.length > 0 ? parts.join(' · ') : null
}

export function formatAccountHealthBadge(health: AccountHealthStatus | undefined): string | null {
  if (!health || (health.state !== 'restricted' && health.state !== 'banned')) return null
  return health.reason || (health.state === 'banned' ? '账号被封禁' : '账号受限')
}

export function formatAnalyticsValue(
  value: number | null | undefined,
  fallback = ''
): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : fallback
}

export function getAnalyticsMetricItems(
  overview: AccountAnalytics['overview'] | null | undefined
): AnalyticsMetricItem[] {
  return ANALYTICS_METRIC_LABELS.flatMap(({ key, label }) => {
    const value = overview?.[key]
    return typeof value === 'number' && Number.isFinite(value) ? [{ key, label, value }] : []
  })
}

export function AnalyticsMetricGrid({
  metrics,
  emptyLabel = '暂无指标'
}: {
  metrics: AnalyticsMetricItem[]
  emptyLabel?: string
}): React.ReactElement {
  if (metrics.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-foreground/[0.05] text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.key} className="rounded-lg bg-foreground/[0.05] p-3">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">
            {formatAnalyticsValue(metric.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

