'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

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
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip />
        <Legend />
        <Line dataKey="follows"      name="Follows"      stroke="#3b82f6" dot={false} strokeWidth={2} />
        <Line dataKey="interactions" name="Interactions" stroke="#f59e0b" dot={false} strokeWidth={2} />
        <Line dataKey="visits"       name="Visits"       stroke="#10b981" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ViewsClicksChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
        <YAxis yAxisId="views"  tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis yAxisId="clicks" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v: unknown) => Number(v).toLocaleString()} />
        <Legend />
        <Line yAxisId="views"  dataKey="views"       name="Page Views"  stroke="#8b5cf6" dot={false} strokeWidth={2} />
        <Line yAxisId="clicks" dataKey="link_clicks" name="Link Clicks" stroke="#ef4444" dot={false} strokeWidth={2} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
        <YAxis yAxisId="total"  domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis yAxisId="change" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip />
        <Legend />
        <Line yAxisId="total"  dataKey="followers"    name="Total Followers" stroke="#3b82f6" dot={false} strokeWidth={2} />
        <Line yAxisId="change" dataKey="daily_change" name="Daily Change"    stroke="#10b981" dot={false} strokeWidth={1} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v: unknown) => Number(v).toLocaleString()} />
        <Legend />
        <Bar dataKey="new_viewers"       name="New Viewers"       fill="#3b82f6" stackId="a" />
        <Bar dataKey="returning_viewers" name="Returning Viewers" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Demographics ───────────────────────────────────────────────────────────

interface GenderSlice { gender: string; distribution: number }
interface TerritorySlice { territory: string; distribution: number }

const GENDER_COLORS: Record<string, string> = {
  Male: '#3b82f6', Female: '#f472b6', Other: '#94a3b8',
}
const TERRITORY_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#e879f9','#64748b','#a78bfa']

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
            <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: unknown) => `${(Number(v) * 100).toFixed(1)}%`} />
      </PieChart>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis type="category" dataKey="territory" width={40} tick={{ fontSize: 12, fill: '#374151' }} />
        <Tooltip formatter={(v: unknown) => `${(Number(v) * 100).toFixed(1)}%`} />
        <Bar dataKey="distribution" name="Distribution" radius={[0, 4, 4, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={entry.territory} fill={TERRITORY_COLORS[i % TERRITORY_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
