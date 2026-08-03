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
  if (value === null) return 'text-gray-400'
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'text-green-500/80' : 'text-red-500/80'
  }
  return 'text-gray-400'
}

function getCellBg(value: number | null): string {
  if (value === null) return ''
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'bg-green-500/5' : 'bg-red-500/5'
  }
  return ''
}

function CorrelationStrengthBar({ value }: { value: number | null }) {
  if (value === null) return null
  const width = Math.abs(value) * 100
  const color = value > 0 ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
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
      <div className="text-center py-8 text-gray-500 text-sm">
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
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                Strong positive (&ge;0.5)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                Strong negative (&le;-0.5)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-300"></span>
                Weak (&lt;0.3)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">
                      Variable
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">
                      vs. Inquiries
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 hidden sm:table-cell">
                      Strength
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">
                      vs. Messaging Contacts
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 hidden sm:table-cell">
                      Strength
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.variable}>
                      <td className="px-4 py-3 text-gray-800 font-medium border-t border-gray-100">
                        {row.variable}
                      </td>
                      <td className={`px-4 py-3 border-t border-gray-100 ${getCellBg(row.vs_inquiries)}`}>
                        <span className={getCellColor(row.vs_inquiries)}>
                          {formatCorr(row.vs_inquiries)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100 hidden sm:table-cell">
                        <CorrelationStrengthBar value={row.vs_inquiries} />
                      </td>
                      <td className={`px-4 py-3 border-t border-gray-100 ${getCellBg(row.vs_messaging)}`}>
                        <span className={getCellColor(row.vs_messaging)}>
                          {formatCorr(row.vs_messaging)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100 hidden sm:table-cell">
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
