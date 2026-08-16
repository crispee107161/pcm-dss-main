import type { RankedAd } from '@/lib/stats/campaign-rankings'

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-rank-gold text-rank-gold-foreground`}>1</span>
  if (rank === 2) return <span className={`${base} bg-muted text-foreground`}>2</span>
  if (rank === 3) return <span className={`${base} bg-rank-bronze text-rank-bronze-foreground`}>3</span>
  return <span className={`${base} bg-secondary text-muted-foreground`}>{rank}</span>
}

// Re-exported so callers importing from this module don't also need to
// reach into lib/stats/campaign-rankings just for the row type.
export type RankRow = RankedAd

export function RankingTable({ rows, valueLabel, formatValue, emptyMessage }: {
  rows: RankRow[]
  valueLabel: string
  formatValue: (v: number) => string
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">{emptyMessage ?? 'No data available. Upload an Ads CSV first.'}</p>
  }
  return (
    <div className="table-scroll rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-10">#</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Ad Name</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">Period</th>
            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-secondary border-t border-border">
              <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground text-sm max-w-xs truncate" title={row.name}>{row.name}</div>
                <div className="text-xs text-muted-foreground truncate" title={row.adSetName}>{row.adSetName}</div>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(row.reportingStarts)} – {formatDate(row.reportingEnds)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">{formatValue(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
