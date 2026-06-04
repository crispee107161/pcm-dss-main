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

export default function RegressionSummary({ model }: RegressionSummaryProps) {
  if (!model) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No regression model trained yet. Upload at least 10 ad records with purchase data.
      </div>
    )
  }

  const isMLR = model.coef_reach != null
  const r2Percent = (model.r_squared * 100).toFixed(1)
  const r2Quality = model.r_squared >= 0.7 ? 'Strong' : model.r_squared >= 0.4 ? 'Moderate' : 'Weak'
  const r2Color = model.r_squared >= 0.7 ? 'text-green-700' : model.r_squared >= 0.4 ? 'text-amber-700' : 'text-red-700'

  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))

  const equation = isMLR
    ? `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach!)}·log(1+Reach) ${s(model.coef_messaging!)}·log(1+Msgs) ${s(model.coef_amount_spent!)}·log(1+Spend)`
    : `Purchases = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`

  return (
    <div className="space-y-4">
      <div className="bg-slate-100 border border-slate-200 border-l-4 border-l-slate-400 rounded-xl p-5 font-mono text-sm text-slate-700 overflow-x-auto">
        <p className="text-slate-400 text-xs mb-2 font-sans"># Regression Equation ({isMLR ? 'Multiple Linear Regression, log-transformed' : 'Simple Linear Regression'})</p>
        {equation}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">R² Score</p>
          <p className={`text-2xl font-bold ${r2Color}`}>{r2Percent}%</p>
          <p className="text-xs text-slate-500 mt-1">{r2Quality} fit</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data Points</p>
          <p className="text-2xl font-bold text-slate-900">{model.n}</p>
          <p className="text-xs text-slate-500 mt-1">ad records</p>
        </div>

        {isMLR ? (
          <>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Residual Std Error</p>
              <p className="text-2xl font-bold text-slate-900">{(model.residual_std_error ?? 0).toFixed(3)}</p>
              <p className="text-xs text-slate-500 mt-1">80% PI width ± {((model.residual_std_error ?? 0) * 1.2816).toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intercept</p>
              <p className="text-2xl font-bold text-slate-900">{model.intercept.toFixed(4)}</p>
              <p className="text-xs text-slate-500 mt-1">baseline</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intercept</p>
              <p className="text-2xl font-bold text-slate-900">{model.intercept.toFixed(4)}</p>
              <p className="text-xs text-slate-500 mt-1">base purchases</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coefficient</p>
              <p className="text-2xl font-bold text-slate-900">{model.coefficient.toFixed(6)}</p>
              <p className="text-xs text-slate-500 mt-1">per ₱ spent</p>
            </div>
          </>
        )}
      </div>

      {isMLR && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">How to read the MLR coefficients</p>
          <ul className="space-y-1 text-xs text-blue-700">
            <li>Each coefficient reflects the change in predicted purchases per unit increase in <em>log(1+x)</em> — capturing diminishing returns.</li>
            <li>Residual Std Error (RSE) of {(model.residual_std_error ?? 0).toFixed(3)} means an 80% prediction interval is approximately ±{((model.residual_std_error ?? 0) * 1.2816).toFixed(2)} purchases wide.</li>
            <li>R² = {r2Percent}% means these three metrics collectively explain {r2Percent}% of variation in purchases.</li>
          </ul>
        </div>
      )}

      <p className="text-slate-400 text-xs">
        Model trained {formatDate(model.trained_at)} using {model.n} records with known purchase outcomes.
      </p>
    </div>
  )
}
