'use client'

import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/lib/chart-tooltip'
import { CHART_GRID_STROKE, CHART_TICK_FILL, chartTick, CHART_COLORS } from '@/lib/chart-axis'

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

function formatPHP(v: number) {
  return `₱${(v / 1000).toFixed(0)}k`
}

export function SpendInquiriesChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="period" tick={chartTick(12)} />
        <YAxis yAxisId="spend" tickFormatter={formatPHP} tick={chartTick(11)} />
        <YAxis yAxisId="inquiries" orientation="right" tick={chartTick(11)} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          labelStyle={chartTooltipLabelStyle}
          formatter={(value: unknown, name: unknown) => {
            const v = Number(value)
            if (name === 'Total Spend') return [`₱${v.toLocaleString()}`, name]
            return [v.toLocaleString(), String(name)]
          }}
        />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Bar yAxisId="spend" dataKey="total_spend" name="Total Spend" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="inquiries" dataKey="total_inquiries" name="Inquiries" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ReachTrendChart({ data }: { data: MonthlyAdTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="period" tick={chartTick(12)} />
        <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={chartTick(11)} />
        <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(v: unknown) => [Number(v).toLocaleString(), 'Reach']} />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Line dataKey="total_reach" name="Ad Reach" stroke={CHART_COLORS.violet} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PostEngagementChart({ data }: { data: MonthlyPostTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="period" tick={chartTick(12)} />
        <YAxis yAxisId="er" tickFormatter={v => `${v.toFixed(1)}%`} tick={chartTick(11)} />
        <YAxis yAxisId="count" orientation="right" tick={chartTick(11)} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          labelStyle={chartTooltipLabelStyle}
          formatter={(value, name) => {
            if (name === 'Avg Engagement Rate') return [`${Number(value).toFixed(2)}%`, name]
            return [Number(value).toLocaleString(), String(name)]
          }}
        />
        <Legend wrapperStyle={{ color: CHART_TICK_FILL }} />
        <Bar yAxisId="er" dataKey="avg_engagement_rate" name="Avg Engagement Rate" fill={CHART_COLORS.orange} radius={[4, 4, 0, 0]} />
        <Bar yAxisId="count" dataKey="post_count" name="Post Count" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function TrendCharts({ adTrends, postTrends }: Props) {
  const hasPostData = postTrends.some(p => p.post_count > 0)
  const emptyPostPeriods = postTrends.filter(p => p.post_count === 0).map(p => p.period)

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl card-shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Ad Spend vs. Inquiries by Reporting Period</h2>
        <p className="text-xs text-gray-500 mb-4">Total ad spend (PHP, left axis) and resulting inquiries (right axis) — separate scales, not directly comparable by bar height</p>
        <SpendInquiriesChart data={adTrends} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl card-shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Ad Reach by Reporting Period</h2>
          <p className="text-xs text-gray-500 mb-4">Total reach summed across ads — people who saw more than one ad are counted more than once</p>
          <ReachTrendChart data={adTrends} />
        </div>

        <div className="bg-card rounded-2xl card-shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Organic Post Engagement</h2>
          <p className="text-xs text-gray-500 mb-4">Average engagement rate and post count per reporting period</p>
          {hasPostData ? (
            <>
              <PostEngagementChart data={postTrends} />
              {emptyPostPeriods.length > 0 && (
                <p className="text-xs text-gray-400 mt-3">
                  No organic post data uploaded for {emptyPostPeriods.join(', ')}.
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              No organic post data uploaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
