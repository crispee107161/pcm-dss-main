import type { LaggedCorrelationOutput } from '@/lib/stats/laggedCorrelation'
import { reportTh, reportThRight, reportTd, reportTdRight } from './ReportPrimitives'

function fmtR(r: number | null): string {
  return r === null ? '—' : r.toFixed(4)
}

function fmtP(p: number | null): string {
  if (p === null) return '—'
  if (p < 0.001) return '<0.001'
  return p.toFixed(3)
}

function corrClass(r: number | null): string {
  if (r === null) return 'text-neutral-500'
  return r >= 0 ? 'text-green-600' : 'text-red-600'
}

const METRIC_LABELS: Record<string, string> = {
  reach: 'Reach',
  messaging: 'Messaging Contacts',
  spend: 'Amount Spent',
}

/** Plain print-report rendering of the lag-correlation table — no colored pills/backgrounds. */
export function PrintLaggedCorrelation({ data }: { data: LaggedCorrelationOutput }) {
  if (!data.has_data) {
    return (
      <p className="text-sm text-neutral-500">
        No ad data available. Upload Ads CSV files to compute time-lagged correlations.
      </p>
    )
  }

  const bestMetricLabel = data.best_metric ? METRIC_LABELS[data.best_metric] : null

  return (
    <div className="space-y-4">
      {data.best_r !== null && bestMetricLabel && (
        <p className="text-sm text-neutral-700">
          Best lag: <strong className="text-neutral-900">{data.best_lag} day{data.best_lag !== 1 ? 's' : ''}</strong>
          {' '}— purchases peak {data.best_lag} day{data.best_lag !== 1 ? 's' : ''} after ad metrics are recorded.
          Strongest predictor: <strong className="text-neutral-900">{bestMetricLabel}</strong> (r = {fmtR(data.best_r)}, p = {fmtP(data.best_p)})
          {data.best_p !== null && data.best_p < 0.05 ? ' — statistically significant.' : ' — not significant at α=0.05.'}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={reportTh}>Lag</th>
              <th className={`${reportThRight} hidden sm:table-cell`}>n pairs</th>
              <th className={reportThRight}>Reach × Purchases</th>
              <th className={reportThRight}>Messaging × Purchases</th>
              <th className={reportThRight}>Spend × Purchases</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map(row => (
              <tr key={row.lag}>
                <td className={`${reportTd} font-medium`}>
                  {row.lag} day{row.lag !== 1 ? 's' : ''}{row.lag === data.best_lag ? ' (best)' : ''}
                </td>
                <td className={`${reportTdRight} hidden sm:table-cell`}>{row.n}</td>
                <td className={reportTdRight}>
                  <span className={corrClass(row.reach_r)}>{fmtR(row.reach_r)}</span>
                  <span className="text-neutral-400 text-xs ml-1">p={fmtP(row.reach_p)}</span>
                </td>
                <td className={reportTdRight}>
                  <span className={corrClass(row.messaging_r)}>{fmtR(row.messaging_r)}</span>
                  <span className="text-neutral-400 text-xs ml-1">p={fmtP(row.messaging_p)}</span>
                </td>
                <td className={reportTdRight}>
                  <span className={corrClass(row.spend_r)}>{fmtR(row.spend_r)}</span>
                  <span className="text-neutral-400 text-xs ml-1">p={fmtP(row.spend_p)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        A lag of N days means: &ldquo;do today&rsquo;s ad metrics predict purchases N days from now?&rdquo; Green = positive relationship, red = negative.
      </p>
    </div>
  )
}
