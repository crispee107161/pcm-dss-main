import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

// For per-unit costs (e.g. cost per messaging conversation) — zero-decimal
// formatting can round two genuinely different ranked values to the same
// displayed number, which makes a correctly-sorted list look broken.
export function formatPhpPrecise(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

export function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

// The arrow always reflects the literal numeric direction of change. Color
// reflects whether that direction is good news for the business — for a cost
// metric like spend, a decrease is favorable, so invertSentiment flips
// green/red without touching the arrow. This is the standard stat-tile
// convention (arrow = math, color = judgment), not a contradiction — but
// since that split isn't obvious from the badge alone, sentimentLabel spells
// it out for screen readers and on hover.
export function DeltaBadge({ delta, deltaLabel, invertSentiment = false }: { delta: number | null; deltaLabel?: string; invertSentiment?: boolean }) {
  if (delta === null) return null
  const increased = delta >= 0
  const isGood = invertSentiment ? !increased : increased
  const sentimentLabel = isGood ? 'favorable' : 'unfavorable'
  return (
    <span
      title={`${increased ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)}% ${deltaLabel ?? 'vs prior period'} — ${sentimentLabel}`}
      className="sensitive inline-flex items-center gap-1.5 flex-wrap text-[10px]"
    >
      <span
        aria-hidden="true"
        className={`inline-flex items-center gap-1 font-bold rounded-full px-2 py-0.5 border whitespace-nowrap ${
          isGood ? 'bg-status-positive/10 border-status-positive/30 text-status-positive' : 'bg-status-negative/10 border-status-negative/30 text-status-negative'
        }`}
      >
        {increased ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
      </span>
      <span aria-hidden="true" className="font-medium text-muted-foreground">{deltaLabel ?? 'vs prior period'}</span>
      <span className="sr-only">{increased ? 'Up' : 'Down'} {Math.abs(delta).toFixed(1)}% {deltaLabel ?? 'vs prior period'}, {sentimentLabel}</span>
    </span>
  )
}

const SPARK_WIDTH = 52
const SPARK_HEIGHT = 34
const SPARK_PADDING = 3

// A shape-only trend indicator, not a labeled chart — the SVG itself is
// aria-hidden. When this card also renders a DeltaBadge, that badge already
// gives screen reader users a direction + magnitude announcement, so adding
// a second "rising/declining" summary here would just repeat it; the
// sr-only summary is only emitted when there's no delta to fall back on.
function Sparkline({ points, color, announce }: { points: number[]; color: string; announce: boolean }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const usableWidth = SPARK_WIDTH - SPARK_PADDING * 2
  const usableHeight = SPARK_HEIGHT - SPARK_PADDING * 2
  const coords = points.map((v, i) => {
    const x = SPARK_PADDING + (i / (points.length - 1)) * usableWidth
    const y = SPARK_PADDING + usableHeight - ((v - min) / range) * usableHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const first = points[0]
  const last = points[points.length - 1]
  const trendLabel = last > first ? 'rising' : last < first ? 'declining' : 'flat'

  return (
    <>
      <svg width={SPARK_WIDTH} height={SPARK_HEIGHT} viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} className="flex-shrink-0" aria-hidden="true">
        <polyline points={coords} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {announce && <span className="sr-only">{points.length}-point trend: {trendLabel}</span>}
    </>
  )
}

interface KpiCardProps {
  label: string
  value: ReactNode
  sub?: string
  delta?: number | null
  deltaLabel?: string
  invertSentiment?: boolean
  icon: ReactNode
  sparkline?: number[]
  sparklineColor?: string
}

export function KpiCard({ label, value, sub, delta, deltaLabel, invertSentiment, icon, sparkline, sparklineColor = 'var(--chart-2)' }: KpiCardProps) {
  return (
    <Card className="rounded-2xl p-5 gap-3" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">{label}</p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary text-muted-foreground">
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="sensitive text-kpi-value font-medium tracking-tight tabular text-foreground">{value}</p>
          {sub && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          )}
          {delta !== undefined && delta !== null && (
            <div className="flex items-center mt-2.5 pt-2.5 border-t border-border">
              <DeltaBadge delta={delta} deltaLabel={deltaLabel} invertSentiment={invertSentiment} />
            </div>
          )}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline points={sparkline} color={sparklineColor} announce={delta === undefined || delta === null} />
        )}
      </div>
    </Card>
  )
}
