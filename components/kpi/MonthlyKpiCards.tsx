import type { MonthlyKpi } from '@/types/index'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

export default function MonthlyKpiCards({ data }: { data: MonthlyKpi[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-semibold text-slate-600 mb-1">No KPI data available</p>
        <p className="text-xs text-slate-400 max-w-[220px]">Upload an Ads CSV to populate monthly performance metrics.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((kpi) => (
        <div key={kpi.period}
          className="bg-white rounded-2xl border border-slate-200/70 p-6 overflow-hidden relative"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06), 0 0 40px rgba(220,38,38,0.02)' }}>

          {/* Spend accent bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400/30" />

          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">{kpi.period}</p>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">
              {kpi.ad_count} ads
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <svg className="w-3 h-3 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px] text-slate-400">Total Spend</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight tabular">{formatPhp(kpi.total_spend)}</p>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400">Purchases</p>
                </div>
                <p className="text-lg font-bold text-red-600 tabular">{formatNumber(kpi.total_purchases)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400">Reach</p>
                </div>
                <p className="text-lg font-bold text-slate-700 tabular">{formatNumber(kpi.total_reach)}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
