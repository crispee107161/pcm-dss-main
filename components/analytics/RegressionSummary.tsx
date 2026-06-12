import type { RegressionModel } from '@/app/generated/prisma/client'

interface RegressionSummaryProps {
  model: RegressionModel | null
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

const MODEL_LABELS: Record<string, { label: string; color: string; description: string }> = {
  log_mlr:   { label: 'Log-Linear MLR',   color: 'bg-blue-100 text-blue-800',     description: 'Log-transformed predictors capture diminishing returns' },
  plain_mlr: { label: 'Plain MLR',         color: 'bg-slate-100 text-slate-700',   description: 'Linear relationship between raw metrics and purchases' },
  poly_mlr:  { label: 'Polynomial MLR',    color: 'bg-purple-100 text-purple-800', description: 'Quadratic spend term captures non-linear ad response curves' },
  ridge_mlr: { label: 'Ridge MLR',         color: 'bg-amber-100 text-amber-800',   description: 'Regularized to reduce overfitting from correlated predictors' },
}

function getModelMeta(model: RegressionModel) {
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')
  return MODEL_LABELS[type] ?? { label: 'Simple Linear Regression', color: 'bg-slate-100 text-slate-700', description: 'Predicts purchases from spend only' }
}

function buildEquation(model: RegressionModel): string {
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')

  if (type === 'plain_mlr' && model.coef_reach != null) {
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·Reach ${s(model.coef_messaging!)}·Msgs ${s(model.coef_amount_spent!)}·Spend`
  }
  if (type === 'poly_mlr' && model.coef_reach != null) {
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_messaging!)}·log(1+Msgs) ${s(model.coef_amount_spent!)}·log(1+Spend) ${s(model.coef_spend_sq ?? 0)}·log(1+Spend)²`
  }
  if (model.coef_reach != null && model.coef_messaging != null && model.coef_amount_spent != null) {
    const suffix = type === 'ridge_mlr' ? ' [ridge λ=0.1]' : ''
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_messaging)}·log(1+Msgs) ${s(model.coef_amount_spent)}·log(1+Spend)${suffix}`
  }
  return `Purchases = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`
}

function computeAdjR2(r2: number, n: number, modelType: string | null, isMLR: boolean): number {
  const p = modelType === 'poly_mlr' ? 4 : isMLR ? 3 : 1
  if (n <= p + 1) return 0
  return 1 - (1 - r2) * (n - 1) / (n - p - 1)
}

export default function RegressionSummary({ model }: RegressionSummaryProps) {
  if (!model) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No regression model trained yet. Upload at least 10 ad records with purchase data.
      </div>
    )
  }

  const isMLR = model.coef_reach != null
  const meta = getModelMeta(model)
  const equation = buildEquation(model)
  const r2Percent = (model.r_squared * 100).toFixed(1)
  const r2Quality = model.r_squared >= 0.7 ? 'Strong' : model.r_squared >= 0.4 ? 'Moderate' : 'Weak'
  const r2Color = model.r_squared >= 0.7 ? 'text-green-700' : model.r_squared >= 0.4 ? 'text-amber-700' : 'text-red-700'
  const adjR2 = computeAdjR2(model.r_squared, model.n, model.model_type, isMLR)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">Auto-selected — best adjusted R² across 4 candidate models</span>
      </div>

      <div className="bg-slate-100 border border-slate-200 border-l-4 border-l-slate-400 rounded-xl p-5 font-mono text-sm text-slate-700 overflow-x-auto">
        <p className="text-slate-400 text-xs mb-2 font-sans"># {meta.label} — {meta.description}</p>
        {equation}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">R² Score</p>
          <p className={`text-2xl font-bold ${r2Color}`}>{r2Percent}%</p>
          <p className="text-xs text-slate-500 mt-1">{r2Quality} fit</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adj. R²</p>
          <p className={`text-2xl font-bold ${adjR2 >= 0.7 ? 'text-green-700' : adjR2 >= 0.4 ? 'text-amber-700' : 'text-red-700'}`}>
            {(adjR2 * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">complexity-adjusted</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data Points</p>
          <p className="text-2xl font-bold text-slate-900">{model.n}</p>
          <p className="text-xs text-slate-500 mt-1">ad records</p>
        </div>

        {isMLR ? (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Residual Std Error</p>
            <p className="text-2xl font-bold text-slate-900">{(model.residual_std_error ?? 0).toFixed(3)}</p>
            <p className="text-xs text-slate-500 mt-1">80% PI ± {((model.residual_std_error ?? 0) * 1.2816).toFixed(2)}</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coefficient</p>
            <p className="text-2xl font-bold text-slate-900">{model.coefficient.toFixed(6)}</p>
            <p className="text-xs text-slate-500 mt-1">per ₱ spent</p>
          </div>
        )}
      </div>

      {isMLR && (
        <details className="group bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 open:pb-4">
          <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
            <span>How to read the {meta.label} coefficients</span>
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <ul className="space-y-2 text-xs text-blue-700 px-4">
            {model.model_type === 'plain_mlr' ? (
              <li>Each coefficient reflects the direct change in purchases per unit increase in the raw metric.</li>
            ) : (
              <li>Each coefficient reflects the change in predicted purchases per unit increase in <em>log(1+x)</em> — capturing diminishing returns.</li>
            )}
            {model.model_type === 'poly_mlr' && (
              <li>The squared spend term ({(model.coef_spend_sq ?? 0) >= 0 ? 'positive' : 'negative'}) captures {(model.coef_spend_sq ?? 0) >= 0 ? 'accelerating' : 'diminishing'} returns at higher spend levels.</li>
            )}
            {model.model_type === 'ridge_mlr' && (
              <li>Ridge regularization (λ=0.1) shrinks coefficients to reduce overfitting when reach and spend are correlated.</li>
            )}
            <li>Residual Std Error (RSE) of {(model.residual_std_error ?? 0).toFixed(3)} means the 80% prediction interval is approximately ±{((model.residual_std_error ?? 0) * 1.2816).toFixed(2)} purchases wide.</li>
            <li>R² = {r2Percent}% · Adj. R² = {(adjR2 * 100).toFixed(1)}% (penalizes extra parameters)</li>
          </ul>
        </details>
      )}

      <p className="text-slate-400 text-xs">
        Model trained {formatDate(model.trained_at)} using {model.n} records with known purchase outcomes.
      </p>
    </div>
  )
}
