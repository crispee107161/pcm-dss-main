import type { RegressionModel } from '@/app/generated/prisma/client'
import type { RegressionInsight } from '@/lib/insights/regression-insight'
import { getModelMeta, buildEquation, computeAdjR2 } from '@/lib/insights/regression-equation'
import InsightHeader, { type InsightDisclosure, type InsightTone } from '@/components/analytics/InsightHeader'

interface RegressionSummaryProps {
  model: RegressionModel | null
  insight?: RegressionInsight | null
  disclosure?: InsightDisclosure
  tone?: InsightTone
  showDetails?: boolean
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

const TONE_CLASSES: Record<InsightTone, {
  badge: string; label: string; equationBox: string; equationLabel: string; equationText: string
  tileBox: string; tileLabel: string; tileValue: string; footnote: string
}> = {
  app: {
    badge: 'bg-gray-100 text-gray-600',
    label: 'text-gray-500',
    equationBox: 'bg-gray-100 border-gray-200 border-l-gray-400 text-gray-700',
    equationLabel: 'text-gray-400',
    equationText: 'text-gray-700',
    tileBox: 'bg-gray-50',
    tileLabel: 'text-gray-500',
    tileValue: 'text-gray-900',
    footnote: 'text-gray-400',
  },
  print: {
    badge: 'bg-neutral-100 text-neutral-600',
    label: 'text-neutral-500',
    equationBox: 'bg-neutral-100 border-neutral-200 border-l-neutral-400 text-neutral-700',
    equationLabel: 'text-neutral-400',
    equationText: 'text-neutral-700',
    tileBox: 'bg-neutral-50',
    tileLabel: 'text-neutral-500',
    tileValue: 'text-neutral-900',
    footnote: 'text-neutral-400',
  },
}

export default function RegressionSummary({ model, insight, disclosure = 'collapsible', tone = 'app', showDetails = true }: RegressionSummaryProps) {
  const t = TONE_CLASSES[tone]

  if (!model) {
    return (
      <div className={`text-center py-8 text-sm ${t.label}`}>
        No regression model trained yet. Upload at least 10 ad records with purchase data.
      </div>
    )
  }

  const isMLR = model.coef_reach != null
  const meta = getModelMeta(model)
  const equation = buildEquation(model)
  const r2Percent = (model.r_squared * 100).toFixed(1)
  const adjR2 = computeAdjR2(model.r_squared, model.n, model.model_type, isMLR)

  const confidence = insight?.confidence ?? (model.r_squared >= 0.7 ? 'high' : model.r_squared >= 0.4 ? 'medium' : 'low')
  const headline = insight?.headline ?? `${meta.label} trained on ${model.n} ad records`

  const details = (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.badge}`}>
              {meta.label}
            </span>
            <span className={`text-xs ${t.label}`}>Auto-selected — best adjusted R² across candidate models</span>
          </div>

          <div className={`border border-l-4 rounded-xl p-5 font-mono text-sm overflow-x-auto ${t.equationBox}`}>
            <p className={`text-xs mb-2 font-sans ${t.equationLabel}`}># {meta.label} — {meta.description}</p>
            {equation}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-xl p-4 ${t.tileBox}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${t.tileLabel}`}>R² Score</p>
              <p className={`text-2xl font-bold ${t.tileValue}`}>{r2Percent}%</p>
              <p className={`text-xs mt-1 ${t.tileLabel}`}>proportion of variance explained</p>
            </div>

            <div className={`rounded-xl p-4 ${t.tileBox}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${t.tileLabel}`}>Adj. R²</p>
              <p className={`text-2xl font-bold ${t.tileValue}`}>{(adjR2 * 100).toFixed(1)}%</p>
              <p className={`text-xs mt-1 ${t.tileLabel}`}>penalized for extra predictors</p>
            </div>

            <div className={`rounded-xl p-4 ${t.tileBox}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${t.tileLabel}`}>Data Points</p>
              <p className={`text-2xl font-bold ${t.tileValue}`}>{model.n}</p>
              <p className={`text-xs mt-1 ${t.tileLabel}`}>ad records</p>
            </div>

            {isMLR ? (
              <div className={`rounded-xl p-4 ${t.tileBox}`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${t.tileLabel}`}>Residual Std Error</p>
                <p className={`text-2xl font-bold ${t.tileValue}`}>{(model.residual_std_error ?? 0).toFixed(3)}</p>
                <p className={`text-xs mt-1 ${t.tileLabel}`}>80% PI ± {((model.residual_std_error ?? 0) * 1.2816).toFixed(2)}</p>
              </div>
            ) : (
              <div className={`rounded-xl p-4 ${t.tileBox}`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${t.tileLabel}`}>Coefficient</p>
                <p className={`text-2xl font-bold ${t.tileValue}`}>{model.coefficient.toFixed(6)}</p>
                <p className={`text-xs mt-1 ${t.tileLabel}`}>per ₱ spent</p>
              </div>
            )}
          </div>

          {insight && insight.marginalEffects.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-2">Marginal effects (from the model&rsquo;s typical operating point)</p>
              <ul className="space-y-1 text-xs">
                {insight.marginalEffects.map(e => (
                  <li key={e.label}>
                    {e.label} {e.deltaInputLabel} &rarr; {e.deltaPurchases >= 0 ? '+' : ''}{e.deltaPurchases.toFixed(2)} purchases
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className={`text-xs ${t.footnote}`}>
            Model trained {formatDate(model.trained_at)} using {model.n} records with known purchase outcomes.
          </p>
        </div>
  )

  return (
    <div className="space-y-4">
      <InsightHeader
        confidence={confidence}
        headline={headline}
        detail={insight?.detail ?? insight?.confidenceDetail}
        disclosure={disclosure}
        tone={tone}
      >
        {showDetails ? details : null}
      </InsightHeader>
    </div>
  )
}
