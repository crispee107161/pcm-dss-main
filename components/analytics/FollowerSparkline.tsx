'use client'

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/lib/chart-tooltip'

interface SparkPoint {
  date: string
  followers: number
}

interface Props {
  data: SparkPoint[]
  currentCount: number
  netChange7d: number
  asOfDate: string
}

export default function FollowerSparkline({ data, currentCount, netChange7d, asOfDate }: Props) {
  const isPositive = netChange7d >= 0
  const strokeColor = isPositive ? '#10b981' : '#ef4444'

  return (
    <div className="flex flex-col h-full justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Page Followers</p>
        <p className="sensitive text-3xl font-bold tracking-tight text-red-600 mt-3">
          {new Intl.NumberFormat('en-PH').format(currentCount)}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
            {asOfDate}
          </span>
          {netChange7d !== 0 && (
            <span className={`sensitive text-xs font-bold rounded-full px-2.5 py-0.5 border ${
              isPositive
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {isPositive ? '+' : ''}{new Intl.NumberFormat('en-PH').format(netChange7d)} <span className="font-normal opacity-70">7d</span>
            </span>
          )}
        </div>
      </div>

      {data.length >= 2 && (
        <div className="h-14 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="followers"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill="url(#followerGrad)"
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{ ...chartTooltipStyle, fontSize: 11, padding: '4px 8px' }}
                formatter={(v: unknown) => [typeof v === 'number' ? new Intl.NumberFormat('en-PH').format(v) : '—', 'Followers']}
                labelStyle={chartTooltipLabelStyle}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
