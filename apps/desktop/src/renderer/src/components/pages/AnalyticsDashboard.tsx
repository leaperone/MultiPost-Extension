import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, RefreshCw, Search, X } from 'lucide-react'
import { PLATFORMS } from '@shared/constants'
import type {
  Account,
  AccountAnalytics,
  AccountStats,
  AccountStatsHistoryPoint,
  PlatformType
} from '@shared/types'
import { AccountAvatar } from '../AccountAvatar'
import { PlatformIcon } from '../PlatformIcon'
import {
  AnalyticsMetricGrid,
  formatAnalyticsValue,
  getAccountLabel,
  getAnalyticsMetricItems,
  supportsAccountAnalytics
} from '../account/analytics-shared'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { BarChartCard, LineChartCard, type ChartDatum, type ChartSeries } from '../ui/chart'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { SimpleSelect, type SimpleSelectOption } from '../ui/select'
import { Spinner } from '../ui/spinner'
import { useUiStore } from '../../store/ui.store'
import {
  accountAnalyticsQueryOptions,
  accountStatsHistoryQueryOptions,
  queryKeys,
  useAccounts,
  useGroups
} from '../../lib/queries'

const ALL_PLATFORMS = 'all'
const ALL_GROUPS = 'all'
const UNGROUPED_GROUP = '__ungrouped__'
const HISTORY_DAYS = 90

type PlatformFilter = typeof ALL_PLATFORMS | PlatformType
type GroupFilter = typeof ALL_GROUPS | typeof UNGROUPED_GROUP | string

interface AccountAnalyticsRecord {
  account: Account
  history: AccountStatsHistoryPoint[]
  analytics: AccountAnalytics | null
  historyError: string | null
  analyticsError: string | null
}

interface AggregateMetric {
  label: string
  value: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function getPlatformName(platform: PlatformType): string {
  return PLATFORMS[platform]?.name || platform
}

function formatDateTick(value: string | number): string {
  const text = String(value)
  const match = text.match(/^\d{4}-(\d{2})-(\d{2})$/)
  return match ? `${match[1]}/${match[2]}` : text
}

function formatSignedValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString()
}

function metricFromStats(stats: AccountStats | undefined, key: keyof AccountStats): number | null {
  const value = stats?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function latestHistoryMetric(
  history: AccountStatsHistoryPoint[],
  key: keyof Pick<AccountStats, 'fans' | 'following' | 'likes' | 'works' | 'views'>
): number | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const value = history[index][key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function currentMetric(
  record: AccountAnalyticsRecord,
  key: keyof Pick<AccountStats, 'fans' | 'following' | 'likes' | 'works' | 'views'>
): number | null {
  return latestHistoryMetric(record.history, key) ?? metricFromStats(record.account.stats, key)
}

function buildOverview(account: Account, analytics: AccountAnalytics | null): AccountAnalytics['overview'] {
  return {
    fans: analytics?.overview.fans ?? account.stats?.fans,
    following: analytics?.overview.following ?? account.stats?.following,
    views: analytics?.overview.views ?? account.stats?.views,
    likes: analytics?.overview.likes ?? account.stats?.likes,
    comments: analytics?.overview.comments,
    works: analytics?.overview.works ?? account.stats?.works
  }
}

function buildLocalFansData(history: AccountStatsHistoryPoint[]): ChartDatum[] {
  return history
    .filter((point) => typeof point.fans === 'number' && Number.isFinite(point.fans))
    .map((point) => ({
      day: point.day,
      fans: point.fans
    }))
}

function buildPlatformGrowthData(analytics: AccountAnalytics | null): ChartDatum[] {
  return (analytics?.fansTrend ?? []).map((point) => ({
    date: point.date,
    value: point.value
  }))
}

function buildComparisonHistory(records: AccountAnalyticsRecord[]): ChartDatum[] {
  const days = new Set<string>()
  const valueByAccountAndDay = records.map((record) => {
    const values = new Map<string, number>()
    for (const point of record.history) {
      if (typeof point.fans === 'number' && Number.isFinite(point.fans)) {
        days.add(point.day)
        values.set(point.day, point.fans)
      }
    }
    return values
  })

  return Array.from(days)
    .sort()
    .map((day) => {
      const row: ChartDatum = { day }
      valueByAccountAndDay.forEach((values, index) => {
        row[`account_${index}`] = values.get(day) ?? null
      })
      return row
    })
}

function buildComparisonSeries(records: AccountAnalyticsRecord[]): ChartSeries[] {
  return records.map((record, index) => ({
    dataKey: `account_${index}`,
    name: `${getAccountLabel(record.account)} · ${getPlatformName(record.account.platform)}`
  }))
}

function buildPlatformShare(records: AccountAnalyticsRecord[]): ChartDatum[] {
  const totals = new Map<PlatformType, number>()
  let totalFans = 0

  for (const record of records) {
    const fans = currentMetric(record, 'fans') ?? 0
    if (fans <= 0) continue
    totals.set(record.account.platform, (totals.get(record.account.platform) ?? 0) + fans)
    totalFans += fans
  }

  if (totalFans <= 0) return []

  return Array.from(totals.entries())
    .map(([platform, fans]) => ({
      platform: getPlatformName(platform),
      share: Number(((fans / totalFans) * 100).toFixed(2))
    }))
    .sort((a, b) => Number(b.share) - Number(a.share))
}

function healthLabel(account: Account): { label: string; destructive: boolean; detail: string | null } {
  const health = account.health
  if (!account.isLoggedIn) {
    return { label: '未登录', destructive: false, detail: '登录后可刷新平台侧数据' }
  }
  if (!health || health.state === 'active') {
    return { label: '状态正常', destructive: false, detail: null }
  }
  if (health.state === 'restricted' || health.state === 'banned') {
    return {
      label: health.state === 'banned' ? '账号被封禁' : '账号受限',
      destructive: true,
      detail: health.reason ?? null
    }
  }
  if (health.state === 'logged_out') {
    return { label: '登录失效', destructive: true, detail: health.reason ?? null }
  }
  return { label: '状态未知', destructive: false, detail: health.reason ?? null }
}

function StatePanel({
  label,
  detail,
  destructive = false
}: {
  label: string
  detail?: string | null
  destructive?: boolean
}): React.ReactElement {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-foreground/[0.05] px-4 text-center">
      {destructive ? (
        <AlertCircle className="size-4 text-destructive" />
      ) : (
        <CheckCircle2 className="size-4 text-foreground" />
      )}
      <span className={destructive ? 'text-sm text-destructive' : 'text-sm text-foreground'}>
        {label}
      </span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  )
}

function MetricStrip({ metrics }: { metrics: AggregateMetric[] }): React.ReactElement {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl bg-card p-4">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="text-2xl font-semibold tabular-nums text-foreground">{metric.value}</div>
        </div>
      ))}
    </div>
  )
}

function SingleAccountView({ record }: { record: AccountAnalyticsRecord }): React.ReactElement {
  const account = record.account
  const platformName = getPlatformName(account.platform)
  const analyticsSupported = supportsAccountAnalytics(account.platform)
  const overview = buildOverview(account, record.analytics)
  const metrics = getAnalyticsMetricItems(overview)
  const localFansData = buildLocalFansData(record.history)
  const platformGrowthData = buildPlatformGrowthData(record.analytics)
  const health = healthLabel(account)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar avatar={account.avatar} platform={account.platform} size={44} />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground">
                {getAccountLabel(account)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PlatformIcon platform={account.platform} size={16} />
                <span>{platformName}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={health.destructive ? 'destructive' : 'default'}>{health.label}</Badge>
            {record.analytics?.updatedAt && (
              <span className="text-xs text-muted-foreground">
                更新于 {new Date(record.analytics.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {health.detail && <div className="pt-3 text-xs text-muted-foreground">{health.detail}</div>}
      </div>

      <AnalyticsMetricGrid metrics={metrics} emptyLabel="暂无概览指标" />

      {record.historyError && (
        <StatePanel label="本地历史加载失败" detail={record.historyError} destructive />
      )}

      <LineChartCard
        title="本地粉丝总数走势"
        description="本地历史快照，数值为粉丝总量"
        data={localFansData}
        xKey="day"
        series={[{ dataKey: 'fans', name: '粉丝总数' }]}
        valueFormatter={formatAnalyticsValue}
        xTickFormatter={formatDateTick}
        emptyLabel="暂无本地粉丝历史"
      />

      {analyticsSupported ? (
        <div className="flex flex-col gap-3">
          {record.analyticsError && (
            <StatePanel label="平台侧数据加载失败" detail={record.analyticsError} destructive />
          )}
          <BarChartCard
            title="平台侧涨粉(日增)"
            description="平台返回的每日增量，独立于粉丝总数"
            data={platformGrowthData}
            xKey="date"
            valueKey="value"
            valueName="日增粉丝"
            valueFormatter={formatSignedValue}
            xTickFormatter={formatDateTick}
            emptyLabel="暂无平台侧日增数据"
          />
        </div>
      ) : (
        <StatePanel label="该平台暂无平台侧数据" detail="仅展示本地积累" />
      )}
    </div>
  )
}

function ComparisonTable({ records }: { records: AccountAnalyticsRecord[] }): React.ReactElement {
  return (
    <div className="overflow-x-auto rounded-xl bg-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">账号</th>
            <th className="px-4 py-3 font-medium">平台</th>
            <th className="px-4 py-3 font-medium">粉丝</th>
            <th className="px-4 py-3 font-medium">获赞</th>
            <th className="px-4 py-3 font-medium">作品</th>
            <th className="px-4 py-3 font-medium">本地历史</th>
            <th className="px-4 py-3 font-medium">平台侧</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const account = record.account
            const fans = currentMetric(record, 'fans')
            const likes = currentMetric(record, 'likes')
            const works = currentMetric(record, 'works')
            const analyticsSupported = supportsAccountAnalytics(account.platform)
            return (
              <tr key={account.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <AccountAvatar avatar={account.avatar} platform={account.platform} size={28} />
                    <span className="truncate font-medium text-foreground">
                      {getAccountLabel(account)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{getPlatformName(account.platform)}</td>
                <td className="px-4 py-3 tabular-nums">{formatAnalyticsValue(fans, '-')}</td>
                <td className="px-4 py-3 tabular-nums">{formatAnalyticsValue(likes, '-')}</td>
                <td className="px-4 py-3 tabular-nums">{formatAnalyticsValue(works, '-')}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {record.historyError ? '加载失败' : `${record.history.length} 天`}
                </td>
                <td className={record.analyticsError ? 'px-4 py-3 text-destructive' : 'px-4 py-3 text-muted-foreground'}>
                  {analyticsSupported
                    ? record.analyticsError
                      ? '加载失败'
                      : '已支持'
                    : '仅本地历史'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ComparisonView({ records }: { records: AccountAnalyticsRecord[] }): React.ReactElement {
  const totalFans = records.reduce((sum, record) => sum + (currentMetric(record, 'fans') ?? 0), 0)
  const totalLikes = records.reduce((sum, record) => sum + (currentMetric(record, 'likes') ?? 0), 0)
  const platformCount = new Set(records.map((record) => record.account.platform)).size
  const aggregateMetrics: AggregateMetric[] = [
    { label: '总粉丝', value: formatAnalyticsValue(totalFans, '0') },
    { label: '总获赞', value: formatAnalyticsValue(totalLikes, '0') },
    { label: '账号数', value: formatAnalyticsValue(records.length, '0') }
  ]
  const platformShare = buildPlatformShare(records)
  const comparisonHistory = buildComparisonHistory(records)
  const comparisonSeries = buildComparisonSeries(records)
  const hasUnsupported = records.some((record) => !supportsAccountAnalytics(record.account.platform))

  return (
    <div className="flex flex-col gap-4">
      <MetricStrip metrics={aggregateMetrics} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <BarChartCard
          title="平台粉丝占比"
          description={`${platformCount} 个平台`}
          data={platformShare}
          xKey="platform"
          valueKey="share"
          valueName="占比"
          valueFormatter={(value) => `${value.toFixed(1)}%`}
          emptyLabel="暂无粉丝占比数据"
        />
        <LineChartCard
          title="多账号本地粉丝总数"
          description="仅使用本地绝对历史，未混入平台侧日增量"
          data={comparisonHistory}
          xKey="day"
          series={comparisonSeries}
          valueFormatter={formatAnalyticsValue}
          xTickFormatter={formatDateTick}
          emptyLabel="暂无可对比的本地粉丝历史"
        />
      </div>
      {hasUnsupported && (
        <StatePanel label="部分平台暂无平台侧数据" detail="多账号对比仅使用本地历史" />
      )}
      <ComparisonTable records={records} />
    </div>
  )
}

function SearchInput({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}): React.ReactElement {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索账号"
        className="pl-8"
      />
    </div>
  )
}

export function AnalyticsDashboard(): React.ReactElement {
  const queryClient = useQueryClient()
  const analyticsAccountIds = useUiStore((state) => state.analyticsAccountIds)
  const setAnalyticsAccountIds = useUiStore((state) => state.setAnalyticsAccountIds)
  const accountsQuery = useAccounts()
  const groupsQuery = useGroups()
  const accounts = accountsQuery.data ?? []
  const groups = groupsQuery.data ?? []
  const accountsLoading = accountsQuery.isPending || accountsQuery.isFetching
  const groupsLoading = groupsQuery.isPending || groupsQuery.isFetching
  const accountsHasLoaded = accountsQuery.isFetched
  const accountsLoadedSuccessfully = accountsQuery.isSuccess
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(ALL_PLATFORMS)
  const [groupFilter, setGroupFilter] = useState<GroupFilter>(ALL_GROUPS)
  const [query, setQuery] = useState('')

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts])

  useEffect(() => {
    if (!accountsLoadedSuccessfully) return
    const validIds = analyticsAccountIds.filter((accountId) => accountById.has(accountId))
    if (validIds.length !== analyticsAccountIds.length) {
      setAnalyticsAccountIds(validIds)
    }
  }, [accountById, accountsLoadedSuccessfully, analyticsAccountIds, setAnalyticsAccountIds])

  const selectedAccounts = useMemo(
    () =>
      analyticsAccountIds.flatMap((accountId) => {
        const account = accountById.get(accountId)
        return account ? [account] : []
      }),
    [accountById, analyticsAccountIds]
  )

  const historyQueries = useQueries({
    queries: selectedAccounts.map((account) =>
      accountStatsHistoryQueryOptions(account, HISTORY_DAYS)
    )
  })
  const analyticsQueries = useQueries({
    queries: selectedAccounts.map((account) =>
      accountAnalyticsQueryOptions(account.id, supportsAccountAnalytics(account.platform))
    )
  })

  const records = useMemo<AccountAnalyticsRecord[]>(
    () =>
      selectedAccounts.map((account, index) => {
        const historyQuery = historyQueries[index]
        const analyticsQuery = analyticsQueries[index]
        const analyticsSupported = supportsAccountAnalytics(account.platform)
        return {
          account,
          history: (historyQuery?.data as AccountStatsHistoryPoint[] | undefined) ?? [],
          analytics: analyticsSupported
            ? ((analyticsQuery?.data as AccountAnalytics | null | undefined) ?? null)
            : null,
          historyError: historyQuery?.error
            ? getErrorMessage(historyQuery.error, '无法加载本地历史')
            : null,
          analyticsError:
            analyticsSupported && analyticsQuery?.error
              ? getErrorMessage(analyticsQuery.error, '无法加载平台侧数据')
              : null
        }
      }),
    [analyticsQueries, historyQueries, selectedAccounts]
  )

  const platformOptions = useMemo<SimpleSelectOption[]>(() => {
    const platforms = Array.from(new Set(accounts.map((account) => account.platform)))
      .map((platform) => ({ value: platform, label: getPlatformName(platform) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
    return [{ value: ALL_PLATFORMS, label: '全部平台' }, ...platforms]
  }, [accounts])

  const groupOptions = useMemo<SimpleSelectOption[]>(
    () => [
      { value: ALL_GROUPS, label: '全部分组' },
      { value: UNGROUPED_GROUP, label: '未分组' },
      ...groups.map((group) => ({ value: group.id, label: group.name }))
    ],
    [groups]
  )

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return accounts.filter((account) => {
      if (platformFilter !== ALL_PLATFORMS && account.platform !== platformFilter) return false
      if (groupFilter === UNGROUPED_GROUP && account.groupId) return false
      if (groupFilter !== ALL_GROUPS && groupFilter !== UNGROUPED_GROUP && account.groupId !== groupFilter) {
        return false
      }
      if (!normalizedQuery) return true
      const label = getAccountLabel(account).toLowerCase()
      return label.includes(normalizedQuery) || account.username.toLowerCase().includes(normalizedQuery)
    })
  }, [accounts, groupFilter, platformFilter, query])

  const visibleSelectedCount = filteredAccounts.filter((account) =>
    analyticsAccountIds.includes(account.id)
  ).length

  const toggleAccount = (accountId: string): void => {
    setAnalyticsAccountIds(
      analyticsAccountIds.includes(accountId)
        ? analyticsAccountIds.filter((id) => id !== accountId)
        : [...analyticsAccountIds, accountId]
    )
  }

  const selectVisibleAccounts = (): void => {
    const next = new Set(analyticsAccountIds)
    for (const account of filteredAccounts) {
      next.add(account.id)
    }
    setAnalyticsAccountIds(Array.from(next))
  }

  const clearVisibleAccounts = (): void => {
    const visibleIds = new Set(filteredAccounts.map((account) => account.id))
    setAnalyticsAccountIds(analyticsAccountIds.filter((accountId) => !visibleIds.has(accountId)))
  }

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.accountsRoot }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
      ...selectedAccounts.map((account) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.account(account.id) })
      )
    ])
  }

  // Keep the no-stale-data invariant: query keys isolate account identities,
  // and while any selected account child query is resolving we hide records
  // instead of showing old analytics under the current selection.
  const recordsLoading =
    selectedAccounts.length > 0 &&
    (historyQueries.some((query) => query.isPending || query.isFetching) ||
      analyticsQueries.some((query, index) => {
        const account = selectedAccounts[index]
        return supportsAccountAnalytics(account.platform) && (query.isPending || query.isFetching)
      }))
  const visibleRecords = recordsLoading ? [] : records
  const selectedRecord = visibleRecords.length === 1 ? visibleRecords[0] : null
  const isDataLoading = recordsLoading
  // Pre-selected ids (e.g. navigated from the accounts page) before the account
  // list has resolved: show loading, not the "choose an account" empty state.
  const hasUnresolvedSelection = analyticsAccountIds.length > 0 && !accountsHasLoaded

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">数据</h1>
        <p className="text-sm text-muted-foreground">跨账号趋势与平台侧涨粉</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
          <SearchInput value={query} onChange={setQuery} />
          <SimpleSelect
            value={platformFilter}
            onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}
            options={platformOptions}
            placeholder="全部平台"
          />
          <SimpleSelect
            value={groupFilter}
            onValueChange={(value) => setGroupFilter(value)}
            options={groupOptions}
            placeholder="全部分组"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={refresh}
            isLoading={accountsLoading || groupsLoading || recordsLoading}
          >
            {!accountsLoading && !groupsLoading && !recordsLoading && <RefreshCw />}
            刷新
          </Button>
        </div>

        {selectedAccounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedAccounts.map((account) => (
              <Badge key={account.id} onClose={() => toggleAccount(account.id)}>
                {getAccountLabel(account)}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            已选 {selectedAccounts.length} 个账号
            {filteredAccounts.length > 0 ? ` · 当前列表 ${visibleSelectedCount}/${filteredAccounts.length}` : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={selectVisibleAccounts} disabled={filteredAccounts.length === 0}>
              全选当前
            </Button>
            <Button size="sm" variant="ghost" onClick={clearVisibleAccounts} disabled={visibleSelectedCount === 0}>
              清空当前
            </Button>
          </div>
        </div>

        {!accountsHasLoaded && accountsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner size="sm" label="加载账号..." />
          </div>
        ) : accounts.length === 0 ? (
          <StatePanel label="暂无账号" detail="先在账号页添加账号" />
        ) : filteredAccounts.length === 0 ? (
          <StatePanel label="没有匹配账号" detail="调整平台、分组或搜索条件" />
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {filteredAccounts.map((account) => {
              const selected = analyticsAccountIds.includes(account.id)
              return (
                <label
                  key={account.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 ${selected ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]'}`}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleAccount(account.id)}
                    aria-label={`选择 ${getAccountLabel(account)}`}
                  />
                  <AccountAvatar avatar={account.avatar} platform={account.platform} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {getAccountLabel(account)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PlatformIcon platform={account.platform} size={14} />
                      {getPlatformName(account.platform)}
                    </span>
                  </span>
                  {selected && <X className="size-4 text-muted-foreground" />}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {selectedAccounts.length === 0 ? (
        hasUnresolvedSelection ? (
          <div className="flex h-48 items-center justify-center rounded-xl bg-card">
            <Spinner size="sm" label="加载数据..." />
          </div>
        ) : (
          <StatePanel label="选择账号后显示数据" detail="选择一个账号查看详情，选择多个账号进入对比" />
        )
      ) : isDataLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-card">
          <Spinner size="sm" label="加载数据..." />
        </div>
      ) : selectedRecord ? (
        <SingleAccountView record={selectedRecord} />
      ) : (
        <ComparisonView records={visibleRecords} />
      )}
    </div>
  )
}
