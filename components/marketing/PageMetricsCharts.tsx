'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Area,
} from 'recharts'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/lib/chart-tooltip'
import { CHART_GRID_STROKE, CHART_TICK_FILL, chartTick, CHART_COLORS } from '@/lib/chart-axis'

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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="date" tick={chartTick(10)} interval="preserveStartEnd" />
        <YAxis tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Line dataKey="follows"      name="Follows"      stroke={CHART_COLORS.blue}   dot={false} strokeWidth={2} />
        <Line dataKey="interactions" name="Interactions" stroke={CHART_COLORS.orange} dot={false} strokeWidth={2} />
        <Line dataKey="visits"       name="Visits"       stroke={CHART_COLORS.green}  dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ViewsClicksChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="date" tick={chartTick(10)} interval="preserveStartEnd" />
        <YAxis yAxisId="views"  tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={chartTick(11)} />
        <YAxis yAxisId="clicks" orientation="right" tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => Number(v).toLocaleString()} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Line yAxisId="views"  dataKey="views"       name="Page Views"  stroke={CHART_COLORS.violet} dot={false} strokeWidth={2} />
        <Line yAxisId="clicks" dataKey="link_clicks" name="Link Clicks" stroke={CHART_COLORS.red}    dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="date" tick={chartTick(10)} interval="preserveStartEnd" />
        <YAxis yAxisId="total"  domain={['auto', 'auto']} tick={chartTick(11)} />
        <YAxis yAxisId="change" orientation="right" tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Line yAxisId="total"  dataKey="followers"    name="Total Followers" stroke={CHART_COLORS.blue}  dot={false} strokeWidth={2} />
        <Line yAxisId="change" dataKey="daily_change" name="Daily Change"    stroke={CHART_COLORS.green} dot={false} strokeWidth={1} />
      </LineChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="date" tick={chartTick(10)} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => Number(v).toLocaleString()} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Bar dataKey="new_viewers"       name="New Viewers"       fill={CHART_COLORS.blue}  stackId="a" />
        <Bar dataKey="returning_viewers" name="Returning Viewers" fill={CHART_COLORS.green} stackId="a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
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
  '#36BFFA', '#66C61C', '#FF9C66', '#EE46BC', CHART_TICK_FILL, '#875BF7',
]

export function GenderPieChart({ data }: { data: GenderSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="distribution"
          nameKey="gender"
          cx="50%" cy="50%"
          outerRadius={80}
          label={(props) => `${props.name} ${((props.value as number) * 100).toFixed(0)}%`}
        >
          {data.map((entry) => (
            <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] ?? CHART_TICK_FILL} />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => `${(Number(v) * 100).toFixed(1)}%`} />
      </PieChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="date" tick={chartTick(10)} interval="preserveStartEnd" />
        <YAxis tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => Number(v).toLocaleString()} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Area
          dataKey="value"
          name="Daily Views"
          fill={CHART_COLORS.blue}
          stroke={CHART_COLORS.blue}
          strokeWidth={1.5}
          dot={false}
          fillOpacity={0.15}
          connectNulls
        />
        <Line
          dataKey="ma"
          name="H-W Fitted"
          stroke={CHART_COLORS.red}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          dataKey="forecast"
          name="H-W Forecast"
          stroke={CHART_COLORS.orange}
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: CHART_COLORS.orange, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function TerritoryChart({ data }: { data: TerritorySlice[] }) {
  const sorted = [...data].sort((a, b) => b.distribution - a.distribution)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
        <XAxis type="number" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={chartTick(11)} />
        <YAxis type="category" dataKey="territory" width={40} tick={chartTick(12)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => `${(Number(v) * 100).toFixed(1)}%`} />
        <Bar dataKey="distribution" name="Distribution" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={entry.territory} fill={TERRITORY_COLORS[i % TERRITORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
