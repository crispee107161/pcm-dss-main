'use client'

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

interface MonthlyAdTrend {
  period: string
  total_spend: number
  total_purchases: number
  total_reach: number
  ad_count: number
  avg_spend_per_ad: number
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

function formatPHP(v: number) {
  return `₱${(v / 1000).toFixed(0)}k`
}

export function SpendPurchasesChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis yAxisId="spend" tickFormatter={formatPHP} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis yAxisId="purchases" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          formatter={(value) => {
            const v = Number(value)
            return [`₱${v.toLocaleString()}`, '']
          }}
        />
        <Legend />
        <Bar yAxisId="spend" dataKey="total_spend" name="Total Spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="purchases" dataKey="total_purchases" name="Purchases" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ReachTrendChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Reach']} />
        <Legend />
        <Line dataKey="total_reach" name="Ad Reach" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PostEngagementChart({ data }: { data: MonthlyPostTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis yAxisId="er" tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          formatter={(value, name) => {
            if (name === 'Avg Engagement Rate') return [`${Number(value).toFixed(2)}%`, name]
            return [Number(value).toLocaleString(), String(name)]
          }}
        />
        <Legend />
        <Bar yAxisId="er" dataKey="avg_engagement_rate" name="Avg Engagement Rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="count" dataKey="post_count" name="Post Count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function TrendCharts({ adTrends, postTrends }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Ad Spend vs. Purchases by Month</h2>
        <p className="text-xs text-slate-500 mb-4">Total ad spend (PHP) and resulting purchases per reporting period</p>
        <SpendPurchasesChart data={adTrends} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Ad Reach by Month</h2>
          <p className="text-xs text-slate-500 mb-4">Total unique reach from paid ads</p>
          <ReachTrendChart data={adTrends} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Organic Post Engagement</h2>
          <p className="text-xs text-slate-500 mb-4">Average engagement rate and post count per month</p>
          {postTrends.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              No organic post data uploaded yet.
            </div>
          ) : (
            <PostEngagementChart data={postTrends} />
          )}
        </div>
      </div>
    </div>
  )
}
