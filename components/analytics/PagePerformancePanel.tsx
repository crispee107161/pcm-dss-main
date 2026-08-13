import { calcDelta, DeltaBadge, formatNumber } from '@/components/kpi/KpiCard'

export interface PagePerformanceRow {
  label: string
  current: number
  prior: number
}

interface PagePerformancePanelProps {
  rows: PagePerformanceRow[]
  deltaLabel?: string
  // False when the prior-period window is too thin to compare against
  // (e.g. a wide filter reaching back before the data starts) — suppresses
  // every row's delta badge rather than show a percentage built from a
  // near-empty denominator.
  deltaReliable?: boolean
  footer?: React.ReactNode
}

// Row accent colors cycle through the chart palette, matching the mockup's
// per-row coloring without hardcoding any of its hex values.
const ROW_COLORS = ['var(--chart-2)', 'var(--chart-1)', 'var(--chart-4)', 'var(--chart-3)']

// Each bar's width is `current / max(current, prior)` — an honest read of
// "up or down vs the prior period" for whichever metric is largest right
// now. This deliberately isn't a share-of-total (there's no shared total
// across Views/Interactions/Follows/Link Clicks), so it should not be read
// as one.
function PerformanceRow({ label, current, prior, deltaLabel, deltaReliable = true, color }: PagePerformanceRow & { deltaLabel?: string; deltaReliable?: boolean; color: string }) {
  const delta = deltaReliable ? calcDelta(current, prior) : null
  const denominator = Math.max(current, prior, 1)
  const pct = Math.min(100, Math.round((current / denominator) * 100))
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="sensitive font-semibold text-foreground tabular">{formatNumber(current)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
      </div>
      {delta !== null && (
        <div className="mt-1.5">
          <DeltaBadge delta={delta} deltaLabel={deltaLabel} />
        </div>
      )}
    </div>
  )
}

export default function PagePerformancePanel({ rows, deltaLabel, deltaReliable, footer }: PagePerformancePanelProps) {
  return (
    <div className="flex flex-col gap-4 flex-1">
      {rows.map((row, i) => (
        <PerformanceRow key={row.label} {...row} deltaLabel={deltaLabel} deltaReliable={deltaReliable} color={ROW_COLORS[i % ROW_COLORS.length]} />
      ))}
      {footer}
    </div>
  )
}
