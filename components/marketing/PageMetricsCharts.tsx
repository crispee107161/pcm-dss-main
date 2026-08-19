'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  ComposedChart, Area,
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

const FORECAST_CONFIG = {
  value: { label: 'Daily Views', color: 'var(--chart-2)' },
  ma: { label: 'Model Fit', color: 'var(--chart-3)' },
  forecast: { label: 'Projected', color: 'var(--chart-5)' },
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

export function ViewsClicksChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <ChartContainer config={VIEWS_CLICKS_CONFIG} className="aspect-auto h-[280px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis yAxisId="views"  tickFormatter={formatCompactCount} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis yAxisId="clicks" orientation="right" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => (
                <ChartTooltipRow color={item.color ?? CHART_COLORS.violet} label={name} value={Number(value).toLocaleString()} />
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line yAxisId="views"  dataKey="views"       name="Page Views"  type="monotone" stroke="var(--color-views)"       dot={false} strokeWidth={2} />
        <Line yAxisId="clicks" dataKey="link_clicks" name="Link Clicks" type="monotone" stroke="var(--color-link_clicks)" dot={false} strokeWidth={2} />
      </LineChart>
    </ChartContainer>
  )
}

// ── Follower history ───────────────────────────────────────────────────────

interface FollowerPoint {
  date: string
  followers: number
  daily_change: number
}

export function FollowerHistoryChart({ data }: { data: FollowerPoint[] }) {
  return (
    <ChartContainer config={FOLLOWER_HISTORY_CONFIG} className="aspect-auto h-[280px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis yAxisId="total"  domain={['auto', 'auto']} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis yAxisId="change" orientation="right" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line yAxisId="total"  dataKey="followers"    name="Total Followers" type="monotone" stroke="var(--color-followers)"    dot={false} strokeWidth={2} />
        <Line yAxisId="change" dataKey="daily_change" name="Daily Change"    type="monotone" stroke="var(--color-daily_change)" dot={false} strokeWidth={1} />
      </LineChart>
    </ChartContainer>
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
const TERRITORY_COLORS = [
  CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red, CHART_COLORS.violet,
  'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)', 'var(--chart-9)', CHART_TICK_FILL, 'var(--chart-10)',
]

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

// ── Moving Average Forecast ────────────────────────────────────────────────

interface ForecastChartPoint {
  date: string
  value?: number
  ma?: number | null
  forecast?: number
}

export function MovingAverageForecastChart({ data }: { data: ForecastChartPoint[] }) {
  return (
    <ChartContainer config={FORECAST_CONFIG} className="aspect-auto h-[300px] w-full">
      <ComposedChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
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
        {/* Gradient fill (chart-area-gradient) — the underlying actual-views
            layer reads as a soft backdrop, so the two overlaid model lines
            (fit + forecast) stay the visual focus. */}
        <defs>
          <linearGradient id="fillDailyViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="value"
          name="Daily Views"
          type="natural"
          fill="url(#fillDailyViews)"
          fillOpacity={0.4}
          stroke="var(--color-value)"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
        <Line
          dataKey="ma"
          name="Model Fit"
          type="monotone"
          stroke="var(--color-ma)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          dataKey="forecast"
          name="Projected"
          type="monotone"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: CHART_COLORS.orange, r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

export function TerritoryChart({ data }: { data: TerritorySlice[] }) {
  const sorted = [...data].sort((a, b) => b.distribution - a.distribution)
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
            <Cell key={entry.territory} fill={TERRITORY_COLORS[i % TERRITORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
