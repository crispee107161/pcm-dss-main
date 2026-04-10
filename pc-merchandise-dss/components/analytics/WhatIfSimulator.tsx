'use client'

import { useActionState } from 'react'
import { runWhatIfAction } from '@/actions/simulate'
import type { SimulationOutput } from '@/types/index'

type SimulationState = SimulationOutput | { error: string } | null

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function WhatIfSimulator() {
  const [state, formAction, isPending] = useActionState<SimulationState, FormData>(
    runWhatIfAction,
    null
  )

  const result = state && !('error' in state) ? state as SimulationOutput : null
  const error = state && 'error' in state ? (state as { error: string }).error : null

  return (
    <div>
      <form action={formAction} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="amount_spent" className="block text-sm font-medium text-slate-700 mb-1">
            Ad Spend Amount (PHP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
            <input
              id="amount_spent"
              name="amount_spent"
              type="number"
              min="0"
              step="0.01"
              placeholder="5000"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

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
            ) : (
              'Simulate'
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 p-5 rounded-xl bg-zinc-950 border border-zinc-800">
          <p className="text-red-500 text-xs font-medium uppercase tracking-wider mb-2">Simulation Result</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-zinc-500 text-sm">If you spend</p>
              <p className="text-2xl font-bold text-white">{formatPhp(result.amount_spent_input)}</p>
            </div>
            <div className="text-zinc-600 text-2xl hidden sm:block">&rarr;</div>
            <div>
              <p className="text-zinc-500 text-sm">Expected purchases</p>
              <p className="text-3xl font-bold text-red-500">
                {Math.max(0, Math.round(result.projected_purchases))}
                <span className="text-base font-normal text-zinc-500 ml-1">purchases</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                (exact: {result.projected_purchases.toFixed(2)})
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Based on: {result.model.equation}
          </p>
          <p className="text-xs text-zinc-600">
            Model R² = {(result.model.r_squared * 100).toFixed(1)}% · {result.model.n} training samples
          </p>
        </div>
      )}
    </div>
  )
}
