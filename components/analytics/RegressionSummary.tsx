'use client'

import { useState } from 'react'
import type { RegressionModel } from '@/app/generated/prisma/client'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  log_mlr:   { label: 'Log-Linear MLR',   color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',     description: 'Log-transformed predictors capture diminishing returns' },
  plain_mlr: { label: 'Plain MLR',         color: 'bg-gray-100 text-gray-600 dark:text-gray-400',   description: 'Linear relationship between raw metrics and purchases' },
  poly_mlr:  { label: 'Polynomial MLR',    color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', description: 'Quadratic spend term captures non-linear ad response curves' },
  ridge_mlr: { label: 'Ridge MLR',         color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',   description: 'Regularized to reduce overfitting from correlated predictors' },
}

function getModelMeta(model: RegressionModel) {
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')
  return MODEL_LABELS[type] ?? { label: 'Simple Linear Regression', color: 'bg-gray-100 text-gray-600 dark:text-gray-400', description: 'Predicts purchases from spend only' }
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

function InfoIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function RegressionSummary({ model }: RegressionSummaryProps) {
  const [open, setOpen] = useState(false)

  if (!model) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No regression model trained yet. Upload at least 10 ad records with purchase data.
      </div>
    )
  }

  const isMLR = model.coef_reach != null
  const meta = getModelMeta(model)
  const equation = buildEquation(model)
  const r2Percent = (model.r_squared * 100).toFixed(1)
  const r2Quality = model.r_squared >= 0.7 ? 'Strong' : model.r_squared >= 0.4 ? 'Moderate' : 'Weak'
  const r2Color = model.r_squared >= 0.7 ? 'text-green-400' : model.r_squared >= 0.4 ? 'text-yellow-400' : 'text-red-400'
  const adjR2 = computeAdjR2(model.r_squared, model.n, model.model_type, isMLR)
  const adjR2Color = adjR2 >= 0.7 ? 'text-green-400' : adjR2 >= 0.4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <TooltipProvider delay={300}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-500">Auto-selected — best adjusted R² across 4 candidate models</span>
        </div>

        <div className="bg-gray-100 border border-gray-200 border-l-4 border-l-gray-400 rounded-xl p-5 font-mono text-sm text-gray-700 overflow-x-auto">
          <p className="text-gray-400 text-xs mb-2 font-sans"># {meta.label} — {meta.description}</p>
          {equation}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">R² Score</p>
              <Tooltip>
                <TooltipTrigger className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"><InfoIcon /></TooltipTrigger>
                <TooltipContent>Proportion of variance in purchases explained by this model. 70%+ = strong, 40–70% = moderate, &lt;40% = weak.</TooltipContent>
              </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${r2Color}`}>{r2Percent}%</p>
            <p className="text-xs text-gray-500 mt-1">{r2Quality} fit</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Adj. R²</p>
              <Tooltip>
                <TooltipTrigger className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"><InfoIcon /></TooltipTrigger>
                <TooltipContent>R² penalized for the number of predictors — prefers simpler models. More reliable than raw R² for comparing model types.</TooltipContent>
              </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${adjR2Color}`}>
              {(adjR2 * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">complexity-adjusted</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Data Points</p>
              <Tooltip>
                <TooltipTrigger className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"><InfoIcon /></TooltipTrigger>
                <TooltipContent>Number of ad records with known purchase outcomes used to train this model. More data generally improves reliability.</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold text-gray-900">{model.n}</p>
            <p className="text-xs text-gray-500 mt-1">ad records</p>
          </div>

          {isMLR ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Residual Std Error</p>
                <Tooltip>
                  <TooltipTrigger className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"><InfoIcon /></TooltipTrigger>
                  <TooltipContent>Average prediction error in purchase units. The 80% prediction interval is ±RSE × 1.28 purchases wide around each forecast.</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900">{(model.residual_std_error ?? 0).toFixed(3)}</p>
              <p className="text-xs text-gray-500 mt-1">80% PI ± {((model.residual_std_error ?? 0) * 1.2816).toFixed(2)}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Coefficient</p>
                <Tooltip>
                  <TooltipTrigger className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"><InfoIcon /></TooltipTrigger>
                  <TooltipContent>Estimated additional purchases per peso of ad spend. Higher means more purchase-efficient spend.</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-gray-900">{model.coefficient.toFixed(6)}</p>
              <p className="text-xs text-gray-500 mt-1">per ₱ spent</p>
            </div>
          )}
        </div>

        {isMLR && (
          <Collapsible open={open} onOpenChange={setOpen} className="bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <CollapsibleTrigger className="w-full px-4 py-3 font-semibold flex items-center justify-between cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset rounded-xl">
              <span>How to read the {meta.label} coefficients</span>
              <svg
                className={`w-4 h-4 text-blue-700 dark:text-blue-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-2 text-xs text-blue-700/90 dark:text-blue-300/80 px-4 pb-4">
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
            </CollapsibleContent>
          </Collapsible>
        )}

        <p className="text-gray-400 text-xs">
          Model trained {formatDate(model.trained_at)} using {model.n} records with known purchase outcomes.
        </p>
      </div>
    </TooltipProvider>
  )
}
