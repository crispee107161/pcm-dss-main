// Cut from MVP v2 scope (see CLAUDE.md "Cut features" and mvp.md §5) — the
// owner/regression and marketing/regression routes that rendered this now
// call notFound() unconditionally, so this component has no live callers.
// Kept on disk deliberately, not dead code to delete on sight.
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import { computeRegressionInsight } from '@/lib/insights/regression-insight'
import { aggregateAdsForTraining } from '@/lib/stats/regression'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const MODEL_TYPE_LABELS: Record<string, string> = {
  log_mlr:         'Log MLR',
  plain_mlr:       'Plain MLR',
  poly_mlr:        'Poly MLR',
  ridge_mlr:       'Ridge MLR',
  lasso_mlr:       'Lasso MLR',
  elastic_net_mlr: 'Elastic Net MLR',
  wls_mlr:         'WLS MLR',
  robust_mlr:      'Robust MLR',
  log_log_mlr:     'Log-Log MLR',
  expanded_mlr:    'Expanded MLR',
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

export default async function RegressionView() {
  const [latestModel, allModels, adHistory] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.regressionModel.findMany({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.findMany({
      where: { total_messaging_contacts: { not: null } },
      select: { ad_name: true, ad_set_name: true, reach: true, amount_spent: true, total_messaging_contacts: true, reporting_starts: true, reporting_ends: true },
    }),
  ])

  const isMLR = latestModel?.coef_reach != null
  const insight = latestModel
    ? computeRegressionInsight(
        latestModel,
        aggregateAdsForTraining(adHistory),
      )
    : null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={isMLR ? 'Multiple Linear Regression' : 'Simple Linear Regression'}
        description={isMLR
          ? 'Predicting messaging conversations from Reach and Amount Spent'
          : 'Predicts messaging conversations based on ad spend'}
      />

      {latestModel ? (
        <Tabs defaultValue="insight">
          <TabsList>
            <TabsTrigger value="insight">What This Tells You</TabsTrigger>
            <TabsTrigger value="details">Model Details</TabsTrigger>
          </TabsList>

          <TabsContent value="insight">
            <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Model</h2>
              <RegressionSummary model={latestModel} insight={insight} />
            </div>
          </TabsContent>

          <TabsContent value="details">
            {allModels.length > 1 ? (
              <div className="bg-card rounded-2xl card-shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Model History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {['ID', 'Type', 'R²', 'Adj R²', 'n', 'RSE', 'Trained'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allModels.map((m) => (
                        <tr key={m.id} className={m.id === latestModel.id ? 'bg-primary/10' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3 text-gray-600 border-t border-gray-100">
                            #{m.id} {m.id === latestModel.id && <span className="text-primary text-xs font-medium">(current)</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 border-t border-gray-100 text-xs">
                            {modelTypeLabel(m.model_type, m.coef_reach != null)}
                          </td>
                          <td className="px-4 py-3 border-t border-gray-100">
                            <span className={`font-semibold ${m.r_squared >= 0.5 ? 'text-status-positive' : 'text-status-warning'}`}>
                              {(m.r_squared * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 border-t border-gray-100">
                            {m.adj_r_squared != null
                              ? <span className={`font-semibold ${m.adj_r_squared >= 0.5 ? 'text-status-positive' : 'text-status-warning'}`}>{(m.adj_r_squared * 100).toFixed(1)}%</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 border-t border-gray-100">{m.n}</td>
                          <td className="px-4 py-3 text-gray-600 border-t border-gray-100 text-xs">
                            {m.residual_std_error != null ? m.residual_std_error.toFixed(3) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 border-t border-gray-100 text-xs whitespace-nowrap">{formatDate(m.trained_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl card-shadow p-12 text-center">
                <p className="text-gray-500 text-sm">Only one model trained so far. Expand &ldquo;See the model behind this&rdquo; on the What This Tells You tab for the full equation and coefficients.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="bg-card rounded-2xl card-shadow p-12 text-center">
          <p className="text-gray-500 text-sm">No model trained yet. Upload Ads CSV data first.</p>
        </div>
      )}
    </div>
  )
}
