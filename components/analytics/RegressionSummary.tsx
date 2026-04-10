import type { RegressionModel } from '@/app/generated/prisma/client'

interface RegressionSummaryProps {
  model: RegressionModel | null
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  const equation = `Purchases = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`
  const r2Percent = (model.r_squared * 100).toFixed(1)
  const r2Quality = model.r_squared >= 0.7 ? 'Strong' : model.r_squared >= 0.4 ? 'Moderate' : 'Weak'
  const r2Color = model.r_squared >= 0.7 ? 'text-green-700' : model.r_squared >= 0.4 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="space-y-4">
      {/* Equation display */}
      <div className="bg-slate-900 rounded-xl p-5 font-mono text-sm text-green-400 overflow-x-auto">
        <p className="text-slate-500 text-xs mb-2 font-sans"># Regression Equation</p>
        {equation}
      </div>

      {/* Stats grid */}
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
      </div>

      <p className="text-slate-400 text-xs">
        Model trained on {formatDate(model.trained_at)} using {model.n} records with known purchase outcomes.
        R² = {r2Percent}% means spending explains {r2Percent}% of variance in purchases.
      </p>
    </div>
  )
}
