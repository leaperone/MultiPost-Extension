import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { cn } from '../../lib/utils'

const CHART_FOREGROUND = 'hsl(var(--foreground))'
const CHART_MUTED = 'hsl(var(--muted-foreground))'
const CHART_BORDER = 'hsl(var(--border))'

export interface ChartDatum {
  [key: string]: string | number | null | undefined
}

export interface ChartSeries {
  dataKey: string
  name: string
}

interface ChartCardBaseProps {
  title: string
  description?: string
  data: ChartDatum[]
  xKey: string
  height?: number
  className?: string
  emptyLabel?: string
  valueFormatter?: (value: number) => string
  xTickFormatter?: (value: string | number) => string
}

export interface LineChartCardProps extends ChartCardBaseProps {
  series: ChartSeries[]
  /**
   * Bridge across missing (null) points. Off by default: with opportunistic
   * local history, a gap means "no snapshot that day", so connecting through it
   * would imply data that doesn't exist (esp. in multi-account comparison rows).
   */
  connectNulls?: boolean
}

export interface BarChartCardProps extends ChartCardBaseProps {
  valueKey: string
  valueName?: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatDefaultValue(value: number): string {
  return value.toLocaleString()
}

function formatTick(
  value: unknown,
  formatter: ((value: string | number) => string) | undefined
): string {
  if ((typeof value === 'string' || typeof value === 'number') && formatter) {
    return formatter(value)
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function hasSeriesData(data: ChartDatum[], keys: string[]): boolean {
  return data.some((point) => keys.some((key) => isFiniteNumber(point[key])))
}

function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter = formatDefaultValue,
  xTickFormatter
}: TooltipProps<ValueType, NameType> & {
  valueFormatter?: (value: number) => string
  xTickFormatter?: (value: string | number) => string
}): React.ReactNode {
  if (!active || !payload || payload.length === 0) return null

  const visiblePayload = payload.filter((entry) => isFiniteNumber(entry.value))
  if (visiblePayload.length === 0) return null

  return (
    <div className="rounded-lg border bg-background p-2 text-xs text-foreground shadow-md">
      <div className="font-medium">{formatTick(label, xTickFormatter)}</div>
      <div className="flex flex-col gap-1 pt-1">
        {visiblePayload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-3">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tabular-nums">{valueFormatter(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartFrame({
  title,
  description,
  className,
  children
}: {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-4 rounded-xl bg-card p-4', className)}>
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-foreground">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {children}
    </div>
  )
}

function ChartEmptyState({ label, height }: { label: string; height: number }): React.ReactElement {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-foreground/[0.05] text-sm text-muted-foreground"
      style={{ height }}
    >
      {label}
    </div>
  )
}

export function LineChartCard({
  title,
  description,
  data,
  xKey,
  series,
  height = 260,
  className,
  emptyLabel = '暂无趋势数据',
  valueFormatter = formatDefaultValue,
  xTickFormatter,
  connectNulls = false
}: LineChartCardProps): React.ReactElement {
  const visibleSeries = series.filter((item) => item.dataKey.length > 0)
  const hasData = visibleSeries.length > 0 && hasSeriesData(data, visibleSeries.map((item) => item.dataKey))

  return (
    <ChartFrame title={title} description={description} className={className}>
      {!hasData ? (
        <ChartEmptyState label={emptyLabel} height={height} />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_BORDER} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_BORDER }}
                minTickGap={24}
                tickFormatter={(value) => formatTick(value, xTickFormatter)}
              />
              <YAxis
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) => (isFiniteNumber(value) ? valueFormatter(value) : '')}
              />
              <Tooltip
                cursor={{ stroke: CHART_BORDER, strokeDasharray: '3 3' }}
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    valueFormatter={valueFormatter}
                    xTickFormatter={xTickFormatter}
                  />
                )}
              />
              {visibleSeries.map((item, index) => (
                <Line
                  key={item.dataKey}
                  type="monotone"
                  dataKey={item.dataKey}
                  name={item.name}
                  stroke={index % 2 === 0 ? CHART_FOREGROUND : CHART_MUTED}
                  strokeOpacity={index < 2 ? 1 : 0.75}
                  strokeDasharray={index < 2 ? undefined : index % 2 === 0 ? '5 4' : '2 4'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: CHART_FOREGROUND, stroke: CHART_FOREGROUND }}
                  connectNulls={connectNulls}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  )
}

export function BarChartCard({
  title,
  description,
  data,
  xKey,
  valueKey,
  valueName = '数值',
  height = 260,
  className,
  emptyLabel = '暂无柱状图数据',
  valueFormatter = formatDefaultValue,
  xTickFormatter
}: BarChartCardProps): React.ReactElement {
  const hasData = hasSeriesData(data, [valueKey])

  return (
    <ChartFrame title={title} description={description} className={className}>
      {!hasData ? (
        <ChartEmptyState label={emptyLabel} height={height} />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_BORDER} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: CHART_BORDER }}
                minTickGap={18}
                tickFormatter={(value) => formatTick(value, xTickFormatter)}
              />
              <YAxis
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value) => (isFiniteNumber(value) ? valueFormatter(value) : '')}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    valueFormatter={valueFormatter}
                    xTickFormatter={xTickFormatter}
                  />
                )}
              />
              <Bar
                dataKey={valueKey}
                name={valueName}
                fill={CHART_FOREGROUND}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  )
}
