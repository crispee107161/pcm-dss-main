'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { ChartTooltipRow } from '@/lib/chart-tooltip'
import { CHART_TICK_FILL, CHART_COLORS, formatCompactCount } from '@/lib/chart-axis'

const DAILY_METRICS_CONFIG = {
  follows: { label: 'Follows', color: 'var(--chart-2)' },
  interactions: { label: 'Interactions', color: 'var(--chart-5)' },
  visits: { label: 'Visits', color: 'var(--chart-1)' },
} satisfies ChartConfig

const VIEWS_CLICKS_CONFIG = {
  views: { label: 'Page Views', color: 'var(--chart-4)' },
  link_clicks: { label: 'Link Clicks', color: 'var(--chart-3)' },
} satisfies ChartConfig

const FOLLOWER_HISTORY_CONFIG = {
  followers: { label: 'Total Followers', color: 'var(--chart-2)' },
  daily_change: { label: 'Daily Change', color: 'var(--chart-1)' },
} satisfies ChartConfig

const VIEWERS_CONFIG = {
  new_viewers: { label: 'New Viewers', color: 'var(--chart-2)' },
  returning_viewers: { label: 'Returning Viewers', color: 'var(--chart-1)' },
} satisfies ChartConfig

// GenderPieChart / TerritoryChart color each Cell individually (dynamic,
// data-driven category names) rather than through a static ChartConfig, so
// this is enough to satisfy ChartContainer's required `config` prop.
const NO_CHART_CONFIG = {}

// ── Daily time-series ──────────────────────────────────────────────────────

interface DailyMetricPoint {
  date: string
  follows?: number | null
  interactions?: number | null
  link_clicks?: number | null
  views?: number | null
  visits?: number | null
}

export function DailyMetricsChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <ChartContainer config={DAILY_METRICS_CONFIG} className="aspect-auto h-[300px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="follows"      name="Follows"      type="monotone" stroke="var(--color-follows)"      dot={false} strokeWidth={2} />
        <Line dataKey="interactions" name="Interactions" type="monotone" stroke="var(--color-interactions)" dot={false} strokeWidth={2} />
        <Line dataKey="visits"       name="Visits"       type="monotone" stroke="var(--color-visits)"       dot={false} strokeWidth={2} />
      </LineChart>
    </ChartContainer>
  )
}

// Views and clicks share a unit (a count) but differ in scale by an order
// of magnitude or more, so a shared axis would flatten clicks to a near-flat
// line at the bottom — same reasoning as TrendCharts.tsx's small multiples:
// two single-axis charts sharing a period axis instead of one dual-axis chart.
export function ViewsClicksChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.violet }} />
          Page Views
        </div>
        <ChartContainer config={VIEWS_CLICKS_CONFIG} className="aspect-auto h-[240px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={value => <ChartTooltipRow color={CHART_COLORS.violet} label="Page Views" value={Number(value).toLocaleString()} />} />}
            />
            <Line dataKey="views" name="Page Views" type="monotone" stroke="var(--color-views)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.red }} />
          Link Clicks
        </div>
        <ChartContainer config={VIEWS_CLICKS_CONFIG} className="aspect-auto h-[240px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={value => <ChartTooltipRow color={CHART_COLORS.red} label="Link Clicks" value={Number(value).toLocaleString()} />} />}
            />
            <Line dataKey="link_clicks" name="Link Clicks" type="monotone" stroke="var(--color-link_clicks)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}

// ── Follower history ───────────────────────────────────────────────────────

interface FollowerPoint {
  date: string
  followers: number
  daily_change: number
}

// Total followers (tens of thousands) and daily change (single/double
// digits) are different scales of the same unit, so — same reasoning as
// ViewsClicksChart above — this renders as two single-axis charts rather
// than one dual-axis chart.
export function FollowerHistoryChart({ data }: { data: FollowerPoint[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.blue }} />
          Total Followers
        </div>
        <ChartContainer config={FOLLOWER_HISTORY_CONFIG} className="aspect-auto h-[240px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={value => <ChartTooltipRow color={CHART_COLORS.blue} label="Total Followers" value={Number(value).toLocaleString()} />} />}
            />
            <Line dataKey="followers" name="Total Followers" type="monotone" stroke="var(--color-followers)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.green }} />
          Daily Change
        </div>
        <ChartContainer config={FOLLOWER_HISTORY_CONFIG} className="aspect-auto h-[240px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={value => <ChartTooltipRow color={CHART_COLORS.green} label="Daily Change" value={Number(value).toLocaleString()} />} />}
            />
            <Line dataKey="daily_change" name="Daily Change" type="monotone" stroke="var(--color-daily_change)" dot={false} strokeWidth={1} />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}

// ── Viewers ────────────────────────────────────────────────────────────────

interface ViewerPoint {
  date: string
  total_viewers: number | null
  new_viewers: number
  returning_viewers: number
}

export function ViewersChart({ data }: { data: ViewerPoint[] }) {
  return (
    <ChartContainer config={VIEWERS_CONFIG} className="aspect-auto h-[280px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <ChartTooltipRow color={item.color ?? CHART_COLORS.blue} label={name} value={Number(value).toLocaleString()} />
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="new_viewers"       name="New Viewers"       fill="var(--color-new_viewers)"       stackId="a" radius={[0, 0, 4, 4]} />
        <Bar dataKey="returning_viewers" name="Returning Viewers" fill="var(--color-returning_viewers)" stackId="a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// ── Demographics ───────────────────────────────────────────────────────────

interface GenderSlice { gender: string; distribution: number }
interface TerritorySlice { territory: string; distribution: number }

const GENDER_COLORS: Record<string, string> = {
  Male: CHART_COLORS.blue, Female: CHART_COLORS.violet, Other: CHART_TICK_FILL,
}
// The 10 validated categorical slots (chart-1..10 in globals.css), in the
// fixed order they were validated in (see globals.css's chart-6..10 comment
// for how) — never cycled.
// A territory past the 10th folds into "Other" (see TerritoryChart) rather
// than reusing a hue, which would make a filtered/refreshed dataset repaint
// an existing territory's color out from under it.
const TERRITORY_COLORS = [
  CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red, CHART_COLORS.violet,
  'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)', 'var(--chart-10)',
]
const TERRITORY_OTHER_COLOR = CHART_TICK_FILL

// Donut (chart-pie-donut) instead of a solid pie — reads cleaner than
// cramming "Male 62%" text onto thin slices, especially for the smallest
// ("Other") category. Percentage labels stay, just moved outside the ring.
export function GenderPieChart({ data }: { data: GenderSlice[] }) {
  return (
    <ChartContainer config={NO_CHART_CONFIG} className="aspect-auto h-[220px] w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="distribution"
          nameKey="gender"
          cx="50%" cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          label={(props) => `${props.name} ${((props.value as number) * 100).toFixed(0)}%`}
        >
          {data.map((entry) => (
            <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] ?? CHART_TICK_FILL} />
          ))}
        </Pie>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="gender" formatter={(value, name, item) => <ChartTooltipRow color={(item.payload as { fill?: string })?.fill ?? item.color ?? CHART_COLORS.blue} label={name} value={`${(Number(value) * 100).toFixed(1)}%`} />} />}
        />
      </PieChart>
    </ChartContainer>
  )
}

// Territory names come straight from an uploaded CSV column (see
// lib/csv/validate-demographics.ts) with no reserved-word check, so a real
// territory can legitimately be named "Other" — folding by name collision
// would silently repaint it gray, or (once overflow also exists) paint two
// different bars the same gray with duplicate React/axis keys. `isOther`
// tags the synthetic bucket structurally instead.
interface FoldedTerritorySlice extends TerritorySlice { isOther?: boolean }

// Territories beyond the 10 validated color slots fold into a single
// "Other" bucket (summed, not dropped) rather than cycling back through
// TERRITORY_COLORS — see the non-negotiable in the dataviz skill: a color
// must never be reused for a second entity on screen at once.
function foldTerritoryOverflow(sorted: TerritorySlice[]): FoldedTerritorySlice[] {
  if (sorted.length <= TERRITORY_COLORS.length) return sorted
  const kept = sorted.slice(0, TERRITORY_COLORS.length)
  const overflow = sorted.slice(TERRITORY_COLORS.length)
  const otherTotal = overflow.reduce((sum, t) => sum + t.distribution, 0)
  return [...kept, { territory: `Other (${overflow.length})`, distribution: otherTotal, isOther: true }]
}

export function TerritoryChart({ data }: { data: TerritorySlice[] }) {
  const sorted = foldTerritoryOverflow([...data].sort((a, b) => b.distribution - a.distribution))
  return (
    <ChartContainer config={NO_CHART_CONFIG} className="aspect-auto h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={sorted}
        layout="vertical"
        margin={{ right: 32, left: 8 }}
      >
        <XAxis type="number" tickFormatter={v => `${(v*100).toFixed(0)}%`} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis type="category" dataKey="territory" width={40} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="territory" formatter={(value, name, item) => <ChartTooltipRow color={(item.payload as { fill?: string })?.fill ?? item.color ?? CHART_COLORS.blue} label={name} value={`${(Number(value) * 100).toFixed(1)}%`} />} />}
        />
        <Bar dataKey="distribution" name="Distribution" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={`${entry.territory}-${i}`} fill={entry.isOther ? TERRITORY_OTHER_COLOR : TERRITORY_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ── Audience.csv (age/gender + top cities) ──────────────────────────────────

interface AgeGenderPoint { age_bracket: string; men_distribution: number; women_distribution: number }

// Reuses the same Male/Female colors as GenderPieChart — same two entities,
// same identity mapping, so a reader doesn't have to relearn the color key
// moving between the two audience charts.
const AGE_GENDER_CONFIG = {
  men_distribution:   { label: 'Men',   color: GENDER_COLORS.Male },
  women_distribution: { label: 'Women', color: GENDER_COLORS.Female },
} satisfies ChartConfig

export function AgeGenderChart({ data }: { data: AgeGenderPoint[] }) {
  return (
    <ChartContainer config={AGE_GENDER_CONFIG} className="aspect-auto h-[260px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="age_bracket" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value, name, item) => <ChartTooltipRow color={item.color ?? CHART_COLORS.blue} label={name} value={`${(Number(value) * 100).toFixed(1)}%`} />} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="men_distribution"   name="Men"   fill="var(--color-men_distribution)"   radius={[4, 4, 0, 0]} />
        <Bar dataKey="women_distribution" name="Women" fill="var(--color-women_distribution)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

interface RankSlice { label: string; distribution: number }
interface FoldedRankSlice extends RankSlice { isOther?: boolean }

// Same fixed 10-hue order and "fold past 10 into Other" rule as
// foldTerritoryOverflow above, generalized to any label field — used for
// Audience.csv's Top cities block.
function foldRankOverflow(sorted: RankSlice[]): FoldedRankSlice[] {
  if (sorted.length <= TERRITORY_COLORS.length) return sorted
  const kept = sorted.slice(0, TERRITORY_COLORS.length)
  const overflow = sorted.slice(TERRITORY_COLORS.length)
  const otherTotal = overflow.reduce((sum, t) => sum + t.distribution, 0)
  return [...kept, { label: `Other (${overflow.length})`, distribution: otherTotal, isOther: true }]
}

// Audience.csv's city labels ("Quezon City, Philippines") run far longer
// than TerritoryChart's 2-letter country codes — truncate for the axis tick
// (the full label is still shown in the tooltip) rather than reusing
// TerritoryChart's narrow width and letting labels overlap illegibly.
const MAX_RANK_LABEL_LENGTH = 24
function truncateRankLabel(label: string): string {
  return label.length > MAX_RANK_LABEL_LENGTH ? `${label.slice(0, MAX_RANK_LABEL_LENGTH - 1)}…` : label
}

export function AudienceRankChart({ data }: { data: RankSlice[] }) {
  const sorted = foldRankOverflow([...data].sort((a, b) => b.distribution - a.distribution))
  return (
    <ChartContainer config={NO_CHART_CONFIG} className="aspect-auto h-[260px] w-full">
      <BarChart
        accessibilityLayer
        data={sorted}
        layout="vertical"
        margin={{ right: 32, left: 8 }}
      >
        <XAxis type="number" tickFormatter={v => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis type="category" dataKey="label" width={140} tickFormatter={truncateRankLabel} tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="label" formatter={(value, name, item) => <ChartTooltipRow color={(item.payload as { fill?: string })?.fill ?? item.color ?? CHART_COLORS.blue} label={name} value={`${(Number(value) * 100).toFixed(1)}%`} />} />}
        />
        <Bar dataKey="distribution" name="Distribution" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={`${entry.label}-${i}`} fill={entry.isOther ? TERRITORY_OTHER_COLOR : TERRITORY_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
