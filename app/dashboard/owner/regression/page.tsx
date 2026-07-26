import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import RegressionSummary from '@/components/analytics/RegressionSummary'

const MODEL_TYPE_LABELS: Record<string, string> = {
  log_mlr:   'Log MLR',
  plain_mlr: 'Plain MLR',
  poly_mlr:  'Poly MLR',
  ridge_mlr: 'Ridge MLR',
}

function modelTypeLabel(modelType: string | null, isMLR: boolean): string {
  if (modelType) return MODEL_TYPE_LABELS[modelType] ?? modelType
  return isMLR ? 'Plain MLR' : 'SLR'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export default async function OwnerRegressionPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const [latestModel, allModels] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.regressionModel.findMany({ orderBy: { trained_at: 'desc' } }),
  ])

  const isMLR = latestModel?.coef_reach != null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={isMLR ? 'Multiple Linear Regression' : 'Simple Linear Regression'}
        description={isMLR
          ? 'Log-transformed MLR predicting purchases from Reach, Messaging Contacts, and Amount Spent (FR-20)'
          : 'Predicts purchases based on ad spend'}
      />

      {latestModel ? (
        <>
          <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Model</h2>
            <RegressionSummary model={latestModel} />
          </div>

          {allModels.length > 1 && (
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Model History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['ID', 'Type', 'R²', 'n', 'RSE', 'Trained'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allModels.map((m) => (
                      <tr key={m.id} className={m.id === latestModel.id ? 'bg-red-500/10' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-600 border-t border-gray-100">
                          #{m.id} {m.id === latestModel.id && <span className="text-red-400 text-xs font-medium">(current)</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 border-t border-gray-100">
                          {modelTypeLabel(m.model_type, m.coef_reach != null)}
                        </td>
                        <td className="px-4 py-3 border-t border-gray-100">
                          <span className={`font-semibold ${m.r_squared >= 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {(m.r_squared * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 border-t border-gray-100">{m.n}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 border-t border-gray-100">
                          {m.residual_std_error != null ? m.residual_std_error.toFixed(3) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100 whitespace-nowrap">{formatDate(m.trained_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-2xl card-shadow p-12 text-center">
          <p className="text-gray-500 text-sm">No model trained yet. The Marketing Manager needs to upload Ads CSV data first.</p>
        </div>
      )}
    </div>
  )
}
