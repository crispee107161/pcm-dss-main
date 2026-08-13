import type { SpearmanRow } from '@/types/index'
import { computeCorrelationInsight } from '@/lib/insights/correlation-insight'
import InsightHeader from '@/components/analytics/InsightHeader'

interface CorrelationTableProps {
  rows: SpearmanRow[]
}

function formatCorr(value: number | null): string {
  if (value === null) return 'N/A'
  return value.toFixed(4)
}

function getCellColor(value: number | null): string {
  if (value === null) return 'text-muted-foreground'
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'text-status-positive font-semibold' : 'text-status-negative font-semibold'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'text-status-positive font-medium' : 'text-status-negative font-medium'
  }
  return 'text-muted-foreground'
}

function getCellBg(value: number | null): string {
  if (value === null) return ''
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'bg-status-positive/10' : 'bg-status-negative/10'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'bg-status-positive/5' : 'bg-status-negative/5'
  }
  return ''
}

function CorrelationStrengthBar({ value }: { value: number | null }) {
  if (value === null) return null
  const width = Math.abs(value) * 100
  const color = value > 0 ? 'bg-status-positive' : 'bg-status-negative'

  return (
    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function CorrelationTable({ rows }: CorrelationTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No data available. Upload ad data to compute correlations.
      </div>
    )
  }

  const insight = computeCorrelationInsight(rows)

  return (
    <div>
      {insight && (
        <div className="mb-5">
          <InsightHeader confidence={insight.confidence} headline={insight.headline} detail={insight.detail}>
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-status-positive"></span>
                Strong positive (&ge;0.5)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-status-negative"></span>
                Strong negative (&le;-0.5)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-border"></span>
                Weak (&lt;0.3)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 bg-secondary">
                      Variable
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 bg-secondary">
                      vs. Messaging Conversations
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 bg-secondary hidden sm:table-cell">
                      Strength
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.variable}>
                      <td className="px-4 py-3 text-foreground font-medium border-t border-border">
                        {row.variable}
                      </td>
                      <td className={`px-4 py-3 border-t border-border ${getCellBg(row.vs_messaging)}`}>
                        <span className={getCellColor(row.vs_messaging)}>
                          {formatCorr(row.vs_messaging)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-border hidden sm:table-cell">
                        <CorrelationStrengthBar value={row.vs_messaging} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InsightHeader>
        </div>
      )}
    </div>
  )
}
