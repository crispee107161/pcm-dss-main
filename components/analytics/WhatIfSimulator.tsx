'use client'

import { useActionState, useState } from 'react'
import { runWhatIfAction } from '@/actions/simulate'
import type { SimulationOutput } from '@/types/index'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

type SimulationState = SimulationOutput | { error: string } | null

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
  }).format(amount)
}

function InputField({
  id, name, label, prefix, placeholder, required, max,
}: {
  id: string; name: string; label: string; prefix?: string; placeholder: string; required?: boolean; max?: number
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">{prefix}</span>
        )}
        <Input
          id={id}
          name={name}
          type="number"
          min="0"
          max={max}
          step={prefix === '₱' ? '0.01' : '1'}
          placeholder={placeholder}
          className={`w-full ${prefix ? 'pl-8' : ''} border-gray-300 focus-visible:ring-ring text-gray-900`}
        />
      </div>
    </div>
  )
}

export default function WhatIfSimulator() {
  const [state, formAction, isPending] = useActionState<SimulationState, FormData>(runWhatIfAction, null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const result = state && !('error' in state) ? (state as SimulationOutput) : null
  const error = state && 'error' in state ? (state as { error: string }).error : null

  const lower = result ? Math.max(0, Math.round(result.interval_lower)) : null
  const upper = result ? Math.max(0, Math.round(result.interval_upper)) : null
  const point = result ? Math.max(0, Math.round(result.projected_inquiries)) : null

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Enter hypothetical engagement values to see a projected messaging conversation count.
      </p>

      <form action={formAction} className="flex flex-wrap gap-3 items-end">
        <InputField id="reach" name="reach" label="Reach (people)" placeholder="5000" max={10_000_000} />
        <InputField id="amount_spent" name="amount_spent" label="Ad Spend (PHP)" prefix="₱" placeholder="5000" required max={1_000_000} />

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-[var(--primary-hover)] disabled:bg-primary/40 text-white rounded-lg px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2 h-[38px]"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : 'Run Simulation'}
          </button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {result && point !== null && lower !== null && upper !== null && (
        <div className="mt-4 p-5 rounded-xl bg-gray-25 border border-gray-100">
          <p className="text-primary text-xs font-medium uppercase tracking-wider mb-3">Simulation Result</p>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Inputs</p>
              <p className="text-sm text-gray-500">Reach: <strong className="sensitive text-white">{result.reach_input.toLocaleString()}</strong></p>
              <p className="text-sm text-gray-500">Spend: <strong className="sensitive text-white">{formatPhp(result.amount_spent_input)}</strong></p>
            </div>

            <div className="text-gray-500 text-2xl hidden sm:block pt-4">&rarr;</div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Predicted Messaging Conversations</p>
              <p className="sensitive text-4xl font-bold text-green-400">
                {point}
                <span className="text-base font-normal text-gray-400 ml-1">conversations</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">80% prediction interval:</span>
                <span className="sensitive text-sm font-semibold text-amber-400">{lower} – {upper}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Interval widens automatically when inputs are far from training data.
              </p>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-lg bg-amber-950/40 border border-amber-700/40">
                  <svg className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-xs text-amber-200/80 leading-relaxed">{w}</p>
                </div>
              ))}
            </div>
          )}

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-4 pt-3 border-t border-gray-100">
            <CollapsibleTrigger className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none">
              <svg
                className={`w-3 h-3 flex-shrink-0 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              See the model behind this
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              <p className="text-xs text-gray-400 font-mono break-all">{result.model.equation}</p>
              <p className="text-xs text-gray-500">
                R² = {(result.model.r_squared * 100).toFixed(1)}% · RSE = {result.model.residual_std_error.toFixed(3)} · n = {result.model.n}
              </p>
              {result.training_ranges && (
                <p className="text-xs text-gray-400">
                  Training ranges · Reach {result.training_ranges.reach[0].toLocaleString()}–{result.training_ranges.reach[1].toLocaleString()}
                  {' · '}Spend {formatPhp(result.training_ranges.spend[0])}–{formatPhp(result.training_ranges.spend[1])}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
