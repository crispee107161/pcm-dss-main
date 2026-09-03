'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, LabelList, Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ChartTooltipRow } from '@/lib/chart-tooltip'
import { CHART_COLORS, formatCompactCount } from '@/lib/chart-axis'
import { median, iqr } from '@/lib/stats/descriptive'

const CPI_HISTOGRAM_CONFIG = {
  count: { label: 'Ads', color: 'var(--chart-4)' },
} satisfies ChartConfig

const CATEGORY_PERFORMANCE_CONFIG = {
  medianEngagement: { label: 'Median Engagement Rate', color: 'var(--chart-5)' },
} satisfies ChartConfig

const REACH_VIEWS_CONFIG = {
  total_reach: { label: 'Total Reach', color: 'var(--chart-2)' },
  total_views: { label: 'Total Views', color: 'var(--chart-4)' },
} satisfies ChartConfig

const PAGE_FUNNEL_CONFIG = {
  visits: { label: 'Page Visits', color: 'var(--chart-1)' },
  follows: { label: 'New Follows', color: 'var(--chart-2)' },
} satisfies ChartConfig

const PAGE_FUNNEL_RATIO_CONFIG = {
  ratioPer100: { label: 'Follows per 100 Page Visits', color: 'var(--chart-5)' },
} satisfies ChartConfig

// ── CPI distribution (histogram + box plot) ─────────────────────────────────

const HISTOGRAM_BIN_COUNT = 9

function buildHistogram(values: number[]): { bin: string; count: number }[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [{ bin: `₱${min.toFixed(0)}`, count: values.length }]

  const width = (max - min) / HISTOGRAM_BIN_COUNT
  const bins = Array.from({ length: HISTOGRAM_BIN_COUNT }, (_, i) => ({ lo: min + i * width, hi: min + (i + 1) * width, count: 0 }))
  for (const v of values) {
    const idx = Math.min(HISTOGRAM_BIN_COUNT - 1, Math.floor((v - min) / width))
    bins[idx].count += 1
  }
  return bins.map(b => ({ bin: `₱${b.lo.toFixed(0)}–${b.hi.toFixed(0)}`, count: b.count }))
}

interface BoxPlotStats { min: number; q1: number; median: number; q3: number; max: number }

// Plain SVG rather than a chart-lib primitive — Recharts has no box-plot mark,
// and this only needs to share a visual x-axis (min..max) with the histogram
// above it, not interactivity.
function BoxPlot({ stats }: { stats: BoxPlotStats }) {
  const { min, q1, median: med, q3, max } = stats
  const range = max - min || 1
  const pct = (v: number) => ((v - min) / range) * 100

  return (
    <div className="px-2 pt-2 pb-1">
      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-8">
        <line x1={pct(min)} x2={pct(q1)} y1={10} y2={10} stroke={CHART_COLORS.violet} strokeWidth={0.6} />
        <line x1={pct(q3)} x2={pct(max)} y1={10} y2={10} stroke={CHART_COLORS.violet} strokeWidth={0.6} />
        <line x1={pct(min)} x2={pct(min)} y1={5} y2={15} stroke={CHART_COLORS.violet} strokeWidth={0.6} />
        <line x1={pct(max)} x2={pct(max)} y1={5} y2={15} stroke={CHART_COLORS.violet} strokeWidth={0.6} />
        <rect x={pct(q1)} width={Math.max(0.5, pct(q3) - pct(q1))} y={2} height={16} fill={CHART_COLORS.violet} fillOpacity={0.22} stroke={CHART_COLORS.violet} strokeWidth={0.6} />
        <line x1={pct(med)} x2={pct(med)} y1={2} y2={18} stroke={CHART_COLORS.violet} strokeWidth={1.4} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular">
        <span>₱{min.toFixed(0)}</span>
        <span>Q1 ₱{q1.toFixed(0)}</span>
        <span className="font-semibold text-foreground">Median ₱{med.toFixed(0)}</span>
        <span>Q3 ₱{q3.toFixed(0)}</span>
        <span>₱{max.toFixed(0)}</span>
      </div>
    </div>
  )
}

export function CpiDistributionChart({ data }: { data: number[] }) {
  const histogram = useMemo(() => (data.length > 0 ? buildHistogram(data) : []), [data])
  const stats = useMemo<BoxPlotStats | null>(() => {
    if (data.length === 0) return null
    const { q1, q3 } = iqr(data)
    return { min: Math.min(...data), q1, median: median(data), q3, max: Math.max(...data) }
  }, [data])

  if (data.length === 0 || !stats) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No ranked ads in this period.</p>
  }

  return (
    <div>
      <ChartContainer config={CPI_HISTOGRAM_CONFIG} className="aspect-auto h-[200px] w-full">
        <BarChart accessibilityLayer data={histogram} margin={{ top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="bin" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} tickMargin={8} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel formatter={v => <ChartTooltipRow color={CHART_COLORS.violet} label="Ads" value={Number(v).toLocaleString()} />} />}
          />
          <Bar dataKey="count" name="Ads" fill="var(--color-count)" radius={6} maxBarSize={56} />
        </BarChart>
      </ChartContainer>
      <BoxPlot stats={stats} />
    </div>
  )
}

// ── Content category performance (median engagement, n labelled per bar) ────

export interface CategoryBarDatum { label: string; medianEngagement: number; n: number }

// Same threshold PostTypePerformanceTable/ad-set-ranking use for "low
// confidence" — a bar built on this few observations shouldn't look as
// authoritative as one built on dozens (docs/raven/Executive_Dashboard_Review.md B6).
const LOW_CONFIDENCE_N = 3

export function CategoryPerformanceChart({ data }: { data: CategoryBarDatum[] }) {
  if (data.length === 0 || data.every(d => d.n === 0)) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No categorised posts in this period.</p>
  }

  return (
    <ChartContainer config={CATEGORY_PERFORMANCE_CONFIG} className="aspect-auto h-full w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 24 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value, _name, item) => {
            const n = (item.payload as CategoryBarDatum).n
            const suffix = n === 0 ? ' — no posts this period' : n < LOW_CONFIDENCE_N ? ` — low confidence (n=${n})` : ` (n=${n})`
            return <ChartTooltipRow color={CHART_COLORS.orange} label="Median Engagement Rate" value={`${Number(value).toFixed(2)}%${suffix}`} />
          }} />}
        />
        <Bar dataKey="medianEngagement" name="Median Engagement Rate" fill="var(--color-medianEngagement)" radius={6} maxBarSize={56}>
          {data.map(d => (
            <Cell key={d.label} fillOpacity={d.n < LOW_CONFIDENCE_N ? 0.35 : 1} />
          ))}
          <LabelList
            dataKey="n"
            position="top"
            offset={8}
            className="fill-muted-foreground"
            fontSize={10}
            formatter={(v: unknown) => (Number(v) === 0 ? 'no posts' : `n=${v}`)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ── Organic post reach/views trend ───────────────────────────────────────────

interface ReachViewsPoint { period: string; total_reach: number; total_views: number }

// Reach and views are both counts but differ in scale (views typically
// outnumber reach several-fold on video posts), so — same reasoning as
// TrendCharts.tsx's small multiples — this renders as two single-axis
// charts sharing a period axis instead of one dual-axis chart.
export function PostReachViewsTrendChart({ data }: { data: ReachViewsPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No organic post data in the last 3 months.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.blue }} />
          Total Reach
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
          <ChartContainer config={REACH_VIEWS_CONFIG} className="aspect-auto h-full w-full">
            <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={v => <ChartTooltipRow color={CHART_COLORS.blue} label="Total Reach" value={Number(v).toLocaleString()} />} />}
              />
              {/* linear + visible dots, not a smoothed curve — this only
                  ever plots the last 3 monthly points, and a curve through
                  3 points draws a saturation shape that isn't in the data
                  (docs/raven/Executive_Dashboard_Review.md B5) */}
              <Line dataKey="total_reach" name="Total Reach" type="linear" stroke="var(--color-total_reach)" dot={{ r: 4 }} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.violet }} />
          Total Views
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
          <ChartContainer config={REACH_VIEWS_CONFIG} className="aspect-auto h-full w-full">
            <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={v => <ChartTooltipRow color={CHART_COLORS.violet} label="Total Views" value={Number(v).toLocaleString()} />} />}
              />
              <Line dataKey="total_views" name="Total Views" type="linear" stroke="var(--color-total_views)" dot={{ r: 4 }} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}

// ── FR-30: follows per 100 page visits ───────────────────────────────────────

interface PageFunnelPoint { period: string; visits: number; follows: number; ratioPer100: number | null }

// Visits and follows are different scales of the same unit (follows are a
// small fraction of visits), so — same reasoning as PostReachViewsTrendChart
// above — this renders as two single-axis charts instead of one dual-axis
// chart.
export function PageFunnelChart({ data }: { data: PageFunnelPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-10 text-center">No page metrics uploaded yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.green }} />
            Page Visits
          </div>
          <ChartContainer config={PAGE_FUNNEL_CONFIG} className="aspect-auto h-[180px] w-full">
            <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={v => <ChartTooltipRow color={CHART_COLORS.green} label="Page Visits" value={Number(v).toLocaleString()} />} />}
              />
              <Line dataKey="visits" name="Page Visits" type="monotone" stroke="var(--color-visits)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.blue }} />
            New Follows
          </div>
          <ChartContainer config={PAGE_FUNNEL_CONFIG} className="aspect-auto h-[180px] w-full">
            <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={v => <ChartTooltipRow color={CHART_COLORS.blue} label="New Follows" value={Number(v).toLocaleString()} />} />}
              />
              <Line dataKey="follows" name="New Follows" type="monotone" stroke="var(--color-follows)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
      <ChartContainer config={PAGE_FUNNEL_RATIO_CONFIG} className="aspect-auto h-[120px] w-full">
        <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
          <YAxis tickFormatter={v => v.toFixed(1)} tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={value => (
                  <ChartTooltipRow
                    color={CHART_COLORS.orange}
                    label="Follows per 100 Page Visits"
                    value={value === null ? '—' : `${Number(value).toFixed(2)} per 100 visits`}
                  />
                )}
              />
            }
          />
          <Line dataKey="ratioPer100" name="Follows per 100 Page Visits" type="monotone" stroke="var(--color-ratioPer100)" dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ChartContainer>
      <p className="text-[11px] text-muted-foreground">
        Visits and follows are independently tracked daily metrics with no per-user link between them — this is not a conversion funnel.
      </p>
    </div>
  )
}
