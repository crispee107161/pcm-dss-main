import type { LaggedCorrelationOutput } from '@/lib/stats/laggedCorrelation'
import InsightHeader, { type InsightDisclosure, type InsightTone } from '@/components/analytics/InsightHeader'

function fmtR(r: number | null): string {
  if (r === null) return '—'
  return r.toFixed(4)
}

function fmtP(p: number | null): string {
  if (p === null) return '—'
  if (p < 0.001) return '<0.001'
  return p.toFixed(3)
}

const TONE_CLASSES: Record<InsightTone, {
  emptyLabel: string; theadBg: string; th: string; borderT: string; nCol: string
  rowLabel: string; footnoteBox: string; footnoteText: string
}> = {
  app: {
    emptyLabel: 'text-muted-foreground',
    theadBg: 'bg-secondary',
    th: 'text-muted-foreground',
    borderT: 'border-border',
    nCol: 'text-muted-foreground',
    rowLabel: 'text-foreground',
    footnoteBox: 'bg-secondary border-border',
    footnoteText: 'text-muted-foreground',
  },
  print: {
    emptyLabel: 'text-neutral-500',
    theadBg: '',
    th: 'text-neutral-600',
    borderT: 'border-neutral-100 border-b-2 border-b-neutral-900',
    nCol: 'text-neutral-500',
    rowLabel: 'text-neutral-900',
    footnoteBox: 'bg-neutral-50 border-neutral-200',
    footnoteText: 'text-neutral-600',
  },
}

function CorrCell({ r, p, tone }: { r: number | null; p: number | null; tone: InsightTone }) {
  const t = TONE_CLASSES[tone]
  if (r === null) return <td className={`px-3 py-2.5 ${t.emptyLabel} border-t ${t.borderT}`}>—</td>

  const abs = Math.abs(r)
  const sig = p !== null && p < 0.05
  const textColor = tone === 'print'
    ? (r > 0 ? 'text-status-positive' : 'text-status-negative')
    : abs >= 0.5
      ? (r > 0 ? 'text-status-positive font-semibold' : 'text-status-negative font-semibold')
      : abs >= 0.3
        ? (r > 0 ? 'text-status-positive' : 'text-status-negative')
        : t.emptyLabel

  const bg = tone === 'app' && abs >= 0.5 ? (r > 0 ? 'bg-status-positive/10' : 'bg-status-negative/10') : ''

  return (
    <td className={`px-3 py-2.5 border-t ${t.borderT} ${bg}`}>
      <span className={textColor}>{fmtR(r)}</span>
      <span className={`ml-1.5 text-xs ${sig ? 'text-status-positive font-medium' : t.nCol}`}>
        p={fmtP(p)}{sig ? ' ✓' : ''}
      </span>
    </td>
  )
}

const METRIC_LABELS: Record<string, string> = {
  reach: 'Reach',
  messaging: 'Messaging Conversations (same day)',
  spend: 'Amount Spent',
}

interface LaggedCorrelationPanelProps {
  data: LaggedCorrelationOutput
  disclosure?: InsightDisclosure
  tone?: InsightTone
  showTable?: boolean
}

export default function LaggedCorrelationPanel({ data, disclosure = 'collapsible', tone = 'app', showTable = true }: LaggedCorrelationPanelProps) {
  const t = TONE_CLASSES[tone]

  if (!data.has_data) {
    return (
      <div className={`text-center py-8 text-sm ${t.emptyLabel}`}>
        No ad data available. Upload Ads CSV files to compute time-lagged correlations.
      </div>
    )
  }

  const bestMetricLabel = data.best_metric ? METRIC_LABELS[data.best_metric] : null
  const isSignificant = data.best_p !== null && data.best_p < 0.05

  const headline = data.best_r !== null && bestMetricLabel
    ? `Messaging conversations peak ${data.best_lag} day${data.best_lag !== 1 ? 's' : ''} after ${bestMetricLabel.toLowerCase()} changes`
    : 'No clear time lag found yet'

  const detail = data.best_r !== null && bestMetricLabel
    ? `${bestMetricLabel} is the strongest predictor at this lag.${isSignificant ? '' : ' This pattern may be coincidence — more data would help confirm it.'}`
    : 'Upload more ad data across a longer date range to detect a lag pattern.'

  const table = (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={t.theadBg}>
              <th className={`text-left text-xs font-medium uppercase tracking-wider px-3 py-3 ${t.th}`}>Lag</th>
              <th className={`text-left text-xs font-medium uppercase tracking-wider px-3 py-3 hidden sm:table-cell ${t.th}`}>n pairs</th>
              <th className={`text-left text-xs font-medium uppercase tracking-wider px-3 py-3 ${t.th}`}>
                <span className="hidden sm:inline">Reach × Messaging Conversations</span>
                <span className="sm:hidden">Reach</span>
              </th>
              <th className={`text-left text-xs font-medium uppercase tracking-wider px-3 py-3 ${t.th}`}>
                <span className="hidden sm:inline">Messaging Conversations (same day) × Later Messaging Conversations</span>
                <span className="sm:hidden">Messaging</span>
              </th>
              <th className={`text-left text-xs font-medium uppercase tracking-wider px-3 py-3 ${t.th}`}>
                <span className="hidden sm:inline">Spend × Messaging Conversations</span>
                <span className="sm:hidden">Spend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.results.map(row => (
              <tr key={row.lag} className={tone === 'app' && row.lag === data.best_lag ? 'ring-1 ring-primary/40' : ''}>
                <td className={`px-3 py-2.5 font-semibold border-t ${t.borderT} ${t.rowLabel}`}>
                  {row.lag} day{row.lag !== 1 ? 's' : ''}
                  {row.lag === data.best_lag && (
                    <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded px-1">best</span>
                  )}
                </td>
                <td className={`px-3 py-2.5 border-t ${t.borderT} hidden sm:table-cell ${t.nCol}`}>{row.n}</td>
                <CorrCell r={row.reach_r} p={row.reach_p} tone={tone} />
                <CorrCell r={row.messaging_r} p={row.messaging_p} tone={tone} />
                <CorrCell r={row.spend_r} p={row.spend_p} tone={tone} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`border rounded-xl p-4 mt-4 text-xs space-y-1 ${t.footnoteBox} ${t.footnoteText}`}>
        <p><strong>How to read this:</strong> A lag of N days means: &ldquo;do today&rsquo;s ad metrics predict messaging conversations N days from now?&rdquo;</p>
        <p>Pearson r is computed by expanding each ad campaign to daily rows (metrics distributed proportionally) then pairing day-D metrics with day-(D+N) messaging conversations.</p>
        <p><strong>✓</strong> = statistically significant (p &lt; 0.05). Green = positive relationship, Red = negative.</p>
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <InsightHeader
        confidence={data.best_r === null ? 'low' : isSignificant ? 'high' : 'low'}
        headline={headline}
        detail={detail}
        disclosure={disclosure}
        tone={tone}
      >
        {showTable ? table : null}
      </InsightHeader>
    </div>
  )
}
