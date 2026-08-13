import type { WatchThroughResult } from '@/lib/stats/watch-through'
import { interpretCorrelation } from '@/lib/stats/interpret'

function fmtPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

// FR-28 — median watch-through rate (Average Seconds viewed / Duration
// (sec)) across video/reel posts, plus its correlation with engagement
// rate. mvp.md frames this as "a stronger content-quality signal than
// views" — the correlation card is why: it's the evidence for that claim,
// not just a summary stat.
export default function WatchThroughCard({ result }: { result: WatchThroughResult }) {
  const interpretation = interpretCorrelation(
    result.correlationWithEngagement.rho,
    result.correlationWithEngagement.n,
    result.correlationWithEngagement.p
  )

  return (
    <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-3">
        Video Watch-Through Rate (n={result.n})
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Median</p>
          <p className="text-lg font-semibold text-gray-800">{fmtPercent(result.medianRate)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Interquartile range</p>
          <p className="text-lg font-semibold text-gray-800">
            {fmtPercent(result.q1Rate)} – {fmtPercent(result.q3Rate)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Correlation with engagement rate</p>
          <p className="text-lg font-semibold text-gray-800">r = {result.correlationWithEngagement.rho.toFixed(3)}</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-2">{interpretation.summary}</p>

      {result.outlierCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {result.outlierCount === 1
            ? '1 post has a raw watch-through rate over 100%'
            : `${result.outlierCount} posts have a raw watch-through rate over 100%`}
          {' '}(looped or replayed views) — capped at 100% for display above, since &quot;watched more than the
          whole video&quot; isn&apos;t a meaningful figure on its own.
        </p>
      )}
    </div>
  )
}
