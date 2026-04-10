import type { SpearmanRow } from '@/types/index'

interface CorrelationTableProps {
  rows: SpearmanRow[]
}

function formatCorr(value: number | null): string {
  if (value === null) return 'N/A'
  return value.toFixed(4)
}

function getCellColor(value: number | null): string {
  if (value === null) return 'text-slate-400'
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'text-green-600' : 'text-red-600'
  }
  return 'text-amber-600'
}

function getCellBg(value: number | null): string {
  if (value === null) return ''
  const abs = Math.abs(value)
  if (abs >= 0.5) {
    return value > 0 ? 'bg-green-50' : 'bg-red-50'
  }
  if (abs >= 0.3) {
    return value > 0 ? 'bg-green-50/50' : 'bg-red-50/50'
  }
  return 'bg-amber-50/50'
}

function CorrelationStrengthBar({ value }: { value: number | null }) {
  if (value === null) return null
  const width = Math.abs(value) * 100
  const color = value > 0 ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function CorrelationTable({ rows }: CorrelationTableProps) {
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
          Strong positive (&ge;0.5)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span>
          Weak (&lt;0.3)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
          Negative
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">
                Variable
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">
                vs. Purchases
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">
                Strength
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">
                vs. Messaging Contacts
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">
                Strength
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variable}>
                <td className="px-4 py-3 text-slate-800 font-medium border-t border-slate-100">
                  {row.variable}
                </td>
                <td className={`px-4 py-3 border-t border-slate-100 ${getCellBg(row.vs_purchases)}`}>
                  <span className={getCellColor(row.vs_purchases)}>
                    {formatCorr(row.vs_purchases)}
                  </span>
                </td>
                <td className="px-4 py-3 border-t border-slate-100">
                  <CorrelationStrengthBar value={row.vs_purchases} />
                </td>
                <td className={`px-4 py-3 border-t border-slate-100 ${getCellBg(row.vs_messaging)}`}>
                  <span className={getCellColor(row.vs_messaging)}>
                    {formatCorr(row.vs_messaging)}
                  </span>
                </td>
                <td className="px-4 py-3 border-t border-slate-100">
                  <CorrelationStrengthBar value={row.vs_messaging} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          No data available. Upload ad data to compute correlations.
        </div>
      )}
    </div>
  )
}
