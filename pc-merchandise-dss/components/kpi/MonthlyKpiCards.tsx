import type { MonthlyKpi } from '@/types/index'

interface MonthlyKpiCardsProps {
  data: MonthlyKpi[]
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

export default function MonthlyKpiCards({ data }: MonthlyKpiCardsProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No monthly KPI data available. Upload ad data first.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((kpi) => (
        <div key={kpi.period} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">{kpi.period}</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400">Total Spend</p>
              <p className="text-xl font-bold text-slate-900">{formatPhp(kpi.total_spend)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Purchases</p>
                <p className="text-lg font-semibold text-red-700">{formatNumber(kpi.total_purchases)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Reach</p>
                <p className="text-lg font-semibold text-slate-700">{formatNumber(kpi.total_reach)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">Active Ads</p>
              <p className="text-base font-semibold text-slate-700">{kpi.ad_count}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
