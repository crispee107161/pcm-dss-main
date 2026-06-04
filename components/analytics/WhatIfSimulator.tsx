'use client'

import { useActionState } from 'react'
import { runWhatIfAction } from '@/actions/simulate'
import type { SimulationOutput } from '@/types/index'

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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">{prefix}</span>
        )}
        <input
          id={id}
          name={name}
          type="number"
          min="0"
          max={max}
          step={prefix === '₱' ? '0.01' : '1'}
          placeholder={placeholder}
          className={`w-full ${prefix ? 'pl-8' : 'pl-3'} pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm`}
        />
      </div>
    </div>
  )
}

export default function WhatIfSimulator() {
  const [state, formAction, isPending] = useActionState<SimulationState, FormData>(runWhatIfAction, null)

  const result = state && !('error' in state) ? (state as SimulationOutput) : null
  const error = state && 'error' in state ? (state as { error: string }).error : null

  const lower = result ? Math.max(0, Math.round(result.interval_lower)) : null
  const upper = result ? Math.max(0, Math.round(result.interval_upper)) : null
  const point = result ? Math.max(0, Math.round(result.projected_purchases)) : null

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        Enter hypothetical engagement values. The model applies log(1+x) transformation to account for diminishing returns.
      </p>

      <form action={formAction} className="flex flex-wrap gap-3 items-end">
        <InputField id="reach" name="reach" label="Reach (people)" placeholder="5000" max={10_000_000} />
        <InputField id="messaging" name="messaging" label="Messaging Contacts" placeholder="120" max={500_000} />
        <InputField id="amount_spent" name="amount_spent" label="Ad Spend (PHP)" prefix="₱" placeholder="5000" required max={1_000_000} />

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white rounded-lg px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2 h-[38px]"
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
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {result && point !== null && lower !== null && upper !== null && (
        <div className="mt-4 p-5 rounded-xl bg-zinc-950 border border-zinc-800">
          <p className="text-red-500 text-xs font-medium uppercase tracking-wider mb-3">Simulation Result</p>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Inputs</p>
              <p className="text-sm text-zinc-300">Reach: <strong className="text-white">{result.reach_input.toLocaleString()}</strong></p>
              <p className="text-sm text-zinc-300">Messaging: <strong className="text-white">{result.messaging_input.toLocaleString()}</strong></p>
              <p className="text-sm text-zinc-300">Spend: <strong className="text-white">{formatPhp(result.amount_spent_input)}</strong></p>
            </div>

            <div className="text-zinc-600 text-2xl hidden sm:block pt-4">&rarr;</div>

            <div>
              <p className="text-zinc-500 text-xs mb-1">Predicted Purchases</p>
              <p className="text-4xl font-bold text-red-500">
                {point}
                <span className="text-base font-normal text-zinc-500 ml-1">purchases</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-zinc-400">Approximate 80% prediction interval:</span>
                <span className="text-sm font-semibold text-amber-400">{lower} – {upper}</span>
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                Based on model residual error (±RSE × 1.28). Actual results may vary, especially for inputs outside the training data range.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-0.5">
            <p className="text-xs text-zinc-500 font-mono break-all">{result.model.equation}</p>
            <p className="text-xs text-zinc-600">
              R² = {(result.model.r_squared * 100).toFixed(1)}% · RSE = {result.model.residual_std_error.toFixed(3)} · n = {result.model.n}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
