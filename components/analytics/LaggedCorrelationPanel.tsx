import type { LaggedCorrelationOutput } from '@/lib/stats/laggedCorrelation'

function fmtR(r: number | null): string {
  if (r === null) return '—'
  return r.toFixed(4)
}

function fmtP(p: number | null): string {
  if (p === null) return '—'
  if (p < 0.001) return '<0.001'
  return p.toFixed(3)
}

function CorrCell({ r, p }: { r: number | null; p: number | null }) {
  if (r === null) return <td className="px-3 py-2.5 text-gray-400 border-t border-gray-100">—</td>

  const abs = Math.abs(r)
  const sig = p !== null && p < 0.05
  const textColor = abs >= 0.5
    ? (r > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold')
    : abs >= 0.3
      ? (r > 0 ? 'text-green-400' : 'text-red-400')
      : 'text-yellow-400'

  return (
    <td className={`px-3 py-2.5 border-t border-gray-100 ${abs >= 0.5 ? (r > 0 ? 'bg-green-500/10' : 'bg-red-500/10') : ''}`}>
      <span className={textColor}>{fmtR(r)}</span>
      <span className={`ml-1.5 text-xs ${sig ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
        p={fmtP(p)}{sig ? ' ✓' : ''}
      </span>
    </td>
  )
}

const METRIC_LABELS: Record<string, string> = {
  reach: 'Reach',
  messaging: 'Messaging Contacts',
  spend: 'Amount Spent',
}

export default function LaggedCorrelationPanel({ data }: { data: LaggedCorrelationOutput }) {
  if (!data.has_data) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No ad data available. Upload Ads CSV files to compute time-lagged correlations.
      </div>
    )
  }

  const bestMetricLabel = data.best_metric ? METRIC_LABELS[data.best_metric] : null

  return (
    <div className="space-y-4">
      {data.best_r !== null && bestMetricLabel && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <span className="text-yellow-400 text-lg flex-shrink-0">⏱</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-yellow-300">
              Best lag: <strong>{data.best_lag} day{data.best_lag !== 1 ? 's' : ''}</strong>
              {' '}— purchases peak {data.best_lag} day{data.best_lag !== 1 ? 's' : ''} after ad metrics are recorded
            </p>
            <p className="text-xs text-yellow-300/80">
              Strongest predictor: <strong>{bestMetricLabel}</strong> (r = {fmtR(data.best_r)}, p = {fmtP(data.best_p)})
              {data.best_p !== null && data.best_p < 0.05 ? ' — statistically significant' : ' — not significant at α=0.05'}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">Lag</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">n pairs</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                <span className="hidden sm:inline">Reach × Purchases</span>
                <span className="sm:hidden">Reach</span>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                <span className="hidden sm:inline">Messaging × Purchases</span>
                <span className="sm:hidden">Messaging</span>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                <span className="hidden sm:inline">Spend × Purchases</span>
                <span className="sm:hidden">Spend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.results.map(row => (
              <tr key={row.lag} className={row.lag === data.best_lag ? 'ring-1 ring-yellow-500/40' : ''}>
                <td className="px-3 py-2.5 font-semibold text-gray-800 border-t border-gray-100">
                  {row.lag} day{row.lag !== 1 ? 's' : ''}
                  {row.lag === data.best_lag && (
                    <span className="ml-1.5 text-xs bg-yellow-500/10 text-yellow-300 rounded px-1">best</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-500 border-t border-gray-100 hidden sm:table-cell">{row.n}</td>
                <CorrCell r={row.reach_r} p={row.reach_p} />
                <CorrCell r={row.messaging_r} p={row.messaging_p} />
                <CorrCell r={row.spend_r} p={row.spend_p} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-1">
        <p><strong>How to read this:</strong> A lag of N days means: &ldquo;do today&rsquo;s ad metrics predict purchases N days from now?&rdquo;</p>
        <p>Pearson r is computed by expanding each ad campaign to daily rows (metrics distributed proportionally) then pairing day-D metrics with day-(D+N) purchases.</p>
        <p><strong>✓</strong> = statistically significant (p &lt; 0.05). Green = positive relationship, Red = negative.</p>
      </div>
    </div>
  )
}
