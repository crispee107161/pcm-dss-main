'use client'

import { AreaChart, Area, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ChartTooltipRow } from '@/lib/chart-tooltip'
import { CHART_COLORS } from '@/lib/chart-axis'

// See TrendCharts.tsx's NO_CHART_CONFIG for why this is empty.
const NO_CHART_CONFIG = {}

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
  const strokeColor = isPositive ? CHART_COLORS.green : CHART_COLORS.red

  // Recharts defaults an Area's y-domain to [0, dataMax] — against a follower
  // count in the tens of thousands, a week's worth of single/double-digit
  // daily change is invisible, pinned flat against the top of the chart.
  // Zooming into the actual min/max (with a little padding) makes the real
  // week's shape visible instead of a flat line.
  const followerValues = data.map(d => d.followers)
  const minFollowers = Math.min(...followerValues)
  const maxFollowers = Math.max(...followerValues)
  const range = maxFollowers - minFollowers
  const yPadding = Math.max(1, Math.round(range * 0.2) || Math.round(maxFollowers * 0.002))
  const yDomain: [number, number] = [minFollowers - yPadding, maxFollowers + yPadding]

  return (
    <div className="flex flex-col h-full justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Page Followers</p>
        <p className="sensitive text-3xl font-bold tracking-tight text-foreground mt-3">
          {new Intl.NumberFormat('en-PH').format(currentCount)}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-0.5">
            {asOfDate}
          </span>
          {netChange7d !== 0 && (
            <span className={`sensitive text-xs font-bold rounded-full px-2.5 py-0.5 border ${
              isPositive
                ? 'bg-status-positive/10 border-status-positive/30 text-status-positive'
                : 'bg-status-negative/10 border-status-negative/30 text-status-negative'
            }`}>
              {isPositive ? '+' : ''}{new Intl.NumberFormat('en-PH').format(netChange7d)} <span className="font-normal opacity-70">7d</span>
            </span>
          )}
        </div>
      </div>

      {data.length >= 2 && (
        <div className="h-14 -mx-1">
          <ChartContainer config={NO_CHART_CONFIG} className="aspect-auto h-full w-full">
            <AreaChart accessibilityLayer data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <YAxis domain={yDomain} hide />
              {/* chart-area-gradient recipe: 5%/95% stop offsets, 0.8/0.1
                  opacity, fillOpacity 0.4 on the Area itself. */}
              <defs>
                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                type="natural"
                dataKey="followers"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill="url(#followerGrad)"
                fillOpacity={0.4}
                dot={false}
                isAnimationActive={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={value => (
                      <ChartTooltipRow
                        color={strokeColor}
                        label="Followers"
                        value={typeof value === 'number' ? new Intl.NumberFormat('en-PH').format(value) : '—'}
                      />
                    )}
                  />
                }
              />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}
