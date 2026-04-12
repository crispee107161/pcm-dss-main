import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import RegressionSummary from '@/components/analytics/RegressionSummary'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export default async function SalesRegressionPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') {
    redirect('/login')
  }

  const [latestModel, allModels] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.regressionModel.findMany({ orderBy: { trained_at: 'desc' } }),
  ])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Simple Linear Regression" description="Predicts purchases based on ad spend" />

      {latestModel ? (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Current Model</h2>
            <RegressionSummary model={latestModel} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Interpretation Guide</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="font-semibold text-slate-800 w-24 flex-shrink-0">R² Score</span>
                <p>Explains what percentage of purchase variation is accounted for by ad spend. An R² of {(latestModel.r_squared * 100).toFixed(1)}% means ad spend explains {(latestModel.r_squared * 100).toFixed(1)}% of variance in purchases.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-slate-800 w-24 flex-shrink-0">Coefficient</span>
                <p>For every additional ₱1 spent on ads, we expect approximately <strong>{latestModel.coefficient.toFixed(6)}</strong> more purchases on average.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-slate-800 w-24 flex-shrink-0">Intercept</span>
                <p>The baseline predicted purchases even when ad spend is ₱0 is <strong>{latestModel.intercept.toFixed(4)}</strong>. This is a mathematical artifact of the model fit.</p>
              </div>
            </div>
          </div>

          {allModels.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Model History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">ID</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Equation</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">R²</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">n</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Trained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allModels.map((m) => (
                      <tr key={m.id} className={m.id === latestModel.id ? 'bg-red-50' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3 text-slate-600 border-t border-slate-100">
                          #{m.id} {m.id === latestModel.id && <span className="text-red-600 text-xs font-medium">(current)</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-700 border-t border-slate-100 font-mono text-xs">
                          {m.intercept.toFixed(4)} + {m.coefficient.toFixed(6)}x
                        </td>
                        <td className="px-4 py-3 border-t border-slate-100">
                          <span className={`font-semibold ${m.r_squared >= 0.5 ? 'text-green-700' : 'text-amber-700'}`}>
                            {(m.r_squared * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 border-t border-slate-100">{m.n}</td>
                        <td className="px-4 py-3 text-slate-500 border-t border-slate-100 text-xs whitespace-nowrap">{formatDate(m.trained_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">No model trained yet. The Marketing Manager must upload Ads CSV data first.</p>
        </div>
      )}
    </div>
  )
}
