'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { ChartTooltipRow } from '@/lib/chart-tooltip'
import { CHART_COLORS, formatCompactCount, formatCompactPhp } from '@/lib/chart-axis'
import { interpretSpendMessagingCompare } from '@/lib/dashboard/interpretations'

// Empty on purpose — every chart below passes its own color via the Bar/Line
// `fill`/`stroke` prop (matching the CHART_COLORS tokens used app-wide)
// rather than shadcn's `var(--color-key)` config convention, so this exists
// only to satisfy ChartContainer's required `config` prop.
const NO_CHART_CONFIG = {}

// SpendTrendChart / MessagingTrendChart / ReachTrendChart's shared config —
// same colors as CHART_COLORS.blue/green/violet (--chart-2/--chart-1/--chart-4),
// just referenced the shadcn way (var(--color-key), driven by this config)
// instead of passed directly, matching shadcn's own chart-bar-multiple /
// chart-line-default examples exactly.
const AD_TREND_CHART_CONFIG = {
  total_spend: { label: 'Total Spend', color: 'var(--chart-2)' },
  total_inquiries: { label: 'Messaging Conversations', color: 'var(--chart-1)' },
  total_reach: { label: 'Ad Reach', color: 'var(--chart-4)' },
} satisfies ChartConfig

// EngagementRateChart / PostCountChart's config — same colors as
// CHART_COLORS.orange/blue (--chart-5/--chart-2).
const POST_TREND_CHART_CONFIG = {
  avg_engagement_rate: { label: 'Avg Engagement Rate', color: 'var(--chart-5)' },
  post_count: { label: 'Post Count', color: 'var(--chart-2)' },
} satisfies ChartConfig

interface MonthlyAdTrend {
  period: string
  total_spend: number
  total_inquiries: number
  total_reach: number
  ad_count: number
}

interface MonthlyPostTrend {
  period: string
  post_count: number
  avg_engagement_rate: number
  total_reach: number
}

interface Props {
  adTrends: MonthlyAdTrend[]
  postTrends: MonthlyPostTrend[]
}

const formatPHP = formatCompactPhp

// Spend and messaging conversations are different units (₱ vs count), so this
// renders as two single-axis small multiples sharing the same period axis
// rather than one dual-axis chart — a dual-axis chart lets bar height imply
// a comparison between two scales that isn't real.
export function SpendTrendChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ChartContainer config={AD_TREND_CHART_CONFIG} className="aspect-auto h-[180px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={formatPHP} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={value => <ChartTooltipRow color={CHART_COLORS.blue} label="Total Spend" value={`₱${Number(value).toLocaleString()}`} />} />}
        />
        <Bar dataKey="total_spend" name="Total Spend" fill="var(--color-total_spend)" radius={6} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

export function MessagingTrendChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ChartContainer config={AD_TREND_CHART_CONFIG} className="aspect-auto h-[180px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={value => <ChartTooltipRow color={CHART_COLORS.green} label="Messaging Conversations" value={Number(value).toLocaleString()} />} />}
        />
        <Bar dataKey="total_inquiries" name="Messaging Conversations" fill="var(--color-total_inquiries)" radius={6} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

export function ReachTrendChart({ data, compact }: { data: MonthlyAdTrend[]; compact?: boolean }) {
  return (
    <ChartContainer config={AD_TREND_CHART_CONFIG} className={compact ? 'aspect-auto h-[180px] w-full' : 'aspect-auto h-[280px] w-full'}>
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={v => <ChartTooltipRow color={CHART_COLORS.violet} label="Reach" value={Number(v).toLocaleString()} />} />}
        />
        {!compact && <ChartLegend content={<ChartLegendContent />} />}
        {/* linear + visible dots, not a smoothed curve — with few monthly
            points, a curve draws a saturation shape that isn't in the data
            (docs/raven/Executive_Dashboard_Review.md B5) */}
        <Line dataKey="total_reach" name="Ad Reach" type="linear" stroke="var(--color-total_reach)" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  )
}

// Engagement rate (%) and post count are different units, so — same reasoning
// as SpendTrendChart/MessagingTrendChart above — this renders as two
// single-axis small multiples instead of one dual-axis chart.
export function EngagementRateChart({ data }: { data: MonthlyPostTrend[] }) {
  return (
    <ChartContainer config={POST_TREND_CHART_CONFIG} className="aspect-auto h-[220px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={value => <ChartTooltipRow color={CHART_COLORS.orange} label="Avg Engagement Rate" value={`${Number(value).toFixed(2)}%`} />} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="avg_engagement_rate" name="Avg Engagement Rate" fill="var(--color-avg_engagement_rate)" radius={6} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

export function PostCountChart({ data }: { data: MonthlyPostTrend[] }) {
  return (
    <ChartContainer config={POST_TREND_CHART_CONFIG} className="aspect-auto h-[220px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={value => <ChartTooltipRow color={CHART_COLORS.blue} label="Post Count" value={Number(value).toLocaleString()} />} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="post_count" name="Post Count" fill="var(--color-post_count)" radius={6} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

const CHART_VIEW_OPTIONS: { value: 'bars' | 'indexed'; label: string }[] = [
  { value: 'bars', label: 'Side by side' },
  { value: 'indexed', label: 'Compare trend' },
]

// Shared toggle for the "side by side" vs "compare trend" chart views. Uses
// the same SlidingTabs mechanism (components/ui/sliding-tabs.tsx) as
// ContentClient.tsx's FilterTabs — one implementation of the sliding
// shared-element indicator, two different skins (this one keeps the
// existing .segmented-control white-surface/shadow indicator; FilterTabs has
// its own brand-filled indicator plus a .segmented-control--bordered track
// for light-mode grouping, added 2026-08-24) — code review (2026-08-23) flagged the two
// segmented controls as duplicated logic before this refactor. `id` keys the
// layoutId: two instances of this component render at once on the trend
// pages (SpendMessagingTrend + PostEngagementTrend below), and a shared
// layoutId across separate instances would animate one's indicator toward
// the other's position instead of staying independent.
function ChartViewToggle({ id, view, onChange }: { id: string; view: 'bars' | 'indexed'; onChange: (view: 'bars' | 'indexed') => void }) {
  return (
    <SlidingTabs
      value={view}
      onChange={onChange}
      options={CHART_VIEW_OPTIONS}
      layoutId={`chart-view-toggle-${id}`}
      ariaLabel="Chart view"
      className="flex-shrink-0 segmented-control"
      segmentClassName={(active) =>
        `segmented-control__segment text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          active ? 'segmented-control__segment--active' : ''
        }`
      }
      indicatorClassName="segmented-control__indicator"
    />
  )
}

interface IndexedSeriesSpec {
  key: string
  indexKey: string
  name: string
  color: string
  format: (v: number) => string
}

// Rebases each series to a shared base period = 100, so two metrics in
// different units (₱ vs a count, % vs a count) can share one y-axis honestly
// instead of the dual-axis trick of implying comparable bar heights. The base
// period is the first period where every series has a non-zero value — using
// data[0] unconditionally would silently flatten a series to 0% whenever the
// earliest period happened to have no spend/posts/etc., while still claiming
// "indexed to {basePeriod} = 100%" in the caption.
function buildIndexedData<T extends { period: string }>(data: T[], series: IndexedSeriesSpec[]): {
  rows: (T & Record<string, number>)[]
  basePeriod: string
} {
  const rows = data as unknown as Record<string, unknown>[]
  const baseIndex = rows.findIndex(row => series.every(s => Number(row[s.key] ?? 0) > 0))
  const resolvedBaseIndex = baseIndex === -1 ? 0 : baseIndex
  const bases = series.map(s => Number(rows[resolvedBaseIndex]?.[s.key] ?? 0))
  const indexedRows = rows.map(row => {
    const indexed: Record<string, number> = {}
    series.forEach((s, i) => {
      const base = bases[i]
      const value = Number(row[s.key] ?? 0)
      indexed[s.indexKey] = base > 0 ? (value / base) * 100 : 0
    })
    return { ...row, ...indexed } as T & Record<string, number>
  })
  return { rows: indexedRows, basePeriod: String(rows[resolvedBaseIndex]?.period ?? 'first period') }
}

// Fills its grid cell rather than using a fixed chart height — this only
// ever renders inside the stacked-grid layout in SpendMessagingTrend /
// PostEngagementTrend below, where the sibling "bars" view (fixed per-chart
// pixel heights) is what actually establishes the cell's real height; that
// gives `h-full` here something definite (not `auto`) to resolve against,
// so the line chart grows to match the bars view instead of looking small
// next to it.
function IndexedComparisonChart<T extends { period: string }>({
  data, series, interpret,
}: {
  data: T[]
  series: [IndexedSeriesSpec, IndexedSeriesSpec]
  // Overrides the generic "indexed to {basePeriod}" caption with a computed
  // finding sentence (docs/dashboard/Dashboard_Plain_Language_and_Notation.md
  // §1/§2) built from the same rows the chart plots.
  interpret?: (data: T[], basePeriod: string) => string
}) {
  const { rows: indexedData, basePeriod } = useMemo(() => buildIndexedData(data, series), [data, series])
  const caption = interpret ? interpret(data, basePeriod) : `Indexed to ${basePeriod} = 100%, so both trends are comparable on one scale.`
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ChartContainer config={NO_CHART_CONFIG} className="aspect-auto h-full w-full">
          <LineChart accessibilityLayer data={indexedData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
            {/* Scaled to the data range, not a fixed 0-based domain - with
                few monthly points, values can sit entirely within a narrow
                band (e.g. 77-102%), and a 0-based axis compresses that band
                into the top of the plot, hiding the decline it exists to show
                (docs/dashboard/Dashboard_Plain_Language_and_Notation.md §2).
                Each accessor pads 10 beyond its own rounded bound (not just
                floor/ceil to the nearest 10) so the domain can never
                collapse to a single point when every series happens to sit
                at the same index value (a one-row or perfectly flat trend) -
                Recharts calls dataMin/dataMax independently, so the padding
                has to be baked into each accessor rather than compared
                across them. Number.isFinite guards an empty dataset, where
                Recharts reports dataMin/dataMax as +/-Infinity. */}
            <YAxis
              domain={[
                (dataMin: number) => Number.isFinite(dataMin) ? Math.max(0, Math.floor(dataMin / 10) * 10 - 10) : 0,
                (dataMax: number) => Number.isFinite(dataMax) ? Math.ceil(dataMax / 10) * 10 + 10 : 100,
              ]}
              tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const spec = series.find(s => s.indexKey === item.dataKey)
                    if (!spec) return null
                    const raw = Number((item.payload as Record<string, unknown>)[spec.key])
                    return <ChartTooltipRow color={spec.color} label={spec.name} value={`${Number(value).toFixed(0)}% (${spec.format(raw)})`} />
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {series.map(s => (
              <Line key={s.indexKey} dataKey={s.indexKey} name={s.name} type="monotone" stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ChartContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{caption}</p>
    </div>
  )
}

const SPEND_SERIES: IndexedSeriesSpec = {
  key: 'total_spend', indexKey: 'total_spend_index', name: 'Total Spend',
  color: CHART_COLORS.blue, format: v => `₱${v.toLocaleString()}`,
}
const MESSAGING_SERIES: IndexedSeriesSpec = {
  key: 'total_inquiries', indexKey: 'total_inquiries_index', name: 'Messaging Conversations',
  color: CHART_COLORS.green, format: v => v.toLocaleString(),
}
const ENGAGEMENT_SERIES: IndexedSeriesSpec = {
  key: 'avg_engagement_rate', indexKey: 'avg_engagement_rate_index', name: 'Avg Engagement Rate',
  color: CHART_COLORS.orange, format: v => `${v.toFixed(2)}%`,
}
const POST_COUNT_SERIES: IndexedSeriesSpec = {
  key: 'post_count', indexKey: 'post_count_index', name: 'Post Count',
  color: CHART_COLORS.blue, format: v => v.toLocaleString(),
}

// Hoisted so the `series` prop is referentially stable across renders —
// passing a fresh array literal at the call site would defeat
// IndexedComparisonChart's useMemo, which depends on `series` by reference.
const AD_TREND_INDEXED_SERIES: [IndexedSeriesSpec, IndexedSeriesSpec] = [SPEND_SERIES, MESSAGING_SERIES]
const POST_TREND_INDEXED_SERIES: [IndexedSeriesSpec, IndexedSeriesSpec] = [ENGAGEMENT_SERIES, POST_COUNT_SERIES]

export function SpendMessagingTrend({ data, heading, showReach }: { data: MonthlyAdTrend[]; heading?: React.ReactNode; showReach?: boolean }) {
  const [view, setView] = useState<'bars' | 'indexed'>('bars')
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-1">
        <div className="flex-1 min-w-0">
          {heading ?? <h2 className="font-semibold text-foreground">Ad Spend vs. Messaging Conversations by Reporting Period</h2>}
          <p className="text-xs text-muted-foreground">
            {view === 'bars'
              ? `Total ad spend${showReach ? ', resulting messaging conversations, and reach' : ' and resulting messaging conversations'}, different units, shown as ${showReach ? 'three charts' : 'two charts'} sharing the same period axis`
              : 'Both series indexed to the first month, so their trend shapes are directly comparable'}
          </p>
        </div>
        <ChartViewToggle id="ad-trend" view={view} onChange={setView} />
      </div>
      {/* Both views stay mounted, stacked in the same grid cell, so the
          container's height is always the taller of the two — switching
          `view` toggles visibility only, never remounts or resizes the
          card (a fixed pixel height here would drift out of sync the next
          time either view's content changes). */}
      <div className="grid mt-3">
        <div
          className={`col-start-1 row-start-1 grid grid-cols-1 ${showReach ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 ${view === 'bars' ? '' : 'invisible pointer-events-none'}`}
          aria-hidden={view !== 'bars'}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.blue }} />
              Total Spend
            </div>
            <SpendTrendChart data={data} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.green }} />
              Messaging Conversations
            </div>
            <MessagingTrendChart data={data} />
          </div>
          {showReach && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.violet }} />
                Ad Reach
              </div>
              <ReachTrendChart data={data} compact />
            </div>
          )}
        </div>
        <div className={`col-start-1 row-start-1 h-full ${view === 'indexed' ? '' : 'invisible pointer-events-none'}`} aria-hidden={view !== 'indexed'}>
          <IndexedComparisonChart
            data={data}
            series={AD_TREND_INDEXED_SERIES}
            interpret={(rows, basePeriod) => {
              const { finding, reachExcludedNote } = interpretSpendMessagingCompare(rows, basePeriod, showReach ?? false)
              const opening = `Total Spend and Messaging Conversations indexed to ${basePeriod} = 100%.`
              return [opening, finding, reachExcludedNote].filter(Boolean).join(' ')
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function PostEngagementTrend({ data, footer }: { data: MonthlyPostTrend[]; footer?: React.ReactNode }) {
  const [view, setView] = useState<'bars' | 'indexed'>('bars')
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground">Organic Post Engagement</h2>
          <p className="text-xs text-muted-foreground">
            {view === 'bars'
              ? 'Average engagement rate and post count per reporting period, different units, shown as two charts'
              : 'Both series indexed to the first month, so their trend shapes are directly comparable'}
          </p>
        </div>
        <ChartViewToggle id="post-trend" view={view} onChange={setView} />
      </div>
      {/* Same stacked-grid approach as SpendMessagingTrend above — both
          views stay mounted so the container height never jumps on toggle. */}
      <div className="grid mt-3">
        <div className={`col-start-1 row-start-1 grid grid-cols-1 sm:grid-cols-2 gap-4 ${view === 'bars' ? '' : 'invisible pointer-events-none'}`} aria-hidden={view !== 'bars'}>
          <EngagementRateChart data={data} />
          <PostCountChart data={data} />
        </div>
        <div className={`col-start-1 row-start-1 h-full ${view === 'indexed' ? '' : 'invisible pointer-events-none'}`} aria-hidden={view !== 'indexed'}>
          <IndexedComparisonChart data={data} series={POST_TREND_INDEXED_SERIES} />
        </div>
      </div>
      {footer}
    </div>
  )
}

export default function TrendCharts({ adTrends, postTrends }: Props) {
  const hasPostData = postTrends.some(p => p.post_count > 0)
  const emptyPostPeriods = postTrends.filter(p => p.post_count === 0).map(p => p.period)

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl card-shadow p-6">
        <SpendMessagingTrend data={adTrends} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl card-shadow p-6">
          <h2 className="font-semibold text-foreground mb-1">Ad Reach by Reporting Period</h2>
          <p className="text-xs text-muted-foreground mb-4">Total reach summed across ads, people who saw more than one ad are counted more than once</p>
          <ReachTrendChart data={adTrends} />
        </div>

        <div className="bg-card rounded-2xl card-shadow p-6">
          {hasPostData ? (
            <PostEngagementTrend
              data={postTrends}
              footer={emptyPostPeriods.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  No organic post data uploaded for {emptyPostPeriods.join(', ')}.
                </p>
              )}
            />
          ) : (
            <>
              <h2 className="font-semibold text-foreground mb-1">Organic Post Engagement</h2>
              <p className="text-xs text-muted-foreground mb-4">Average engagement rate and post count per reporting period</p>
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No organic post data uploaded yet.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
