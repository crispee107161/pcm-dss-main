'use client'

import { useActionState } from 'react'
import { runBudgetAllocation, type AllocateState } from '@/actions/allocate'
import type { AdSetAllocation } from '@/lib/stats/budget-allocator'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

function modelLabel(modelType: string): string {
  const labels: Record<string, string> = {
    log_mlr:         'Log-Linear MLR',
    plain_mlr:       'Linear MLR',
    poly_mlr:        'Polynomial MLR',
    ridge_mlr:       'Ridge MLR',
    lasso_mlr:       'Lasso MLR',
    elastic_net_mlr: 'Elastic Net MLR',
    wls_mlr:         'WLS MLR',
    robust_mlr:      'Robust MLR',
    log_log_mlr:     'Log-Log MLR',
    expanded_mlr:    'Expanded MLR',
    slr:             'Simple Linear Regression',
  }
  return labels[modelType] ?? modelType
}

function PctBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 tabular-nums">{(pct * 100).toFixed(1)}%</span>
    </div>
  )
}

function AllocationRow({ row, rank }: { row: AdSetAllocation; rank: number }) {
  const point = Math.round(row.projected_purchases)
  const lower = Math.round(row.interval_lower)
  const upper = Math.round(row.interval_upper)

  return (
    <TableRow className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
      <TableCell className="px-4 py-3 text-slate-400 text-xs w-8">{rank}</TableCell>
      <TableCell className="px-4 py-3">
        <div className="font-semibold text-slate-800 text-sm max-w-[180px] truncate" title={row.ad_set_name}>
          {row.ad_set_name}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Hist. CPA: {row.historical_cpa !== null ? formatPHP(row.historical_cpa) : '—'} · {row.historical_purchases} past purchases
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <PctBar pct={row.pct} />
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className="font-bold text-slate-800">{formatPHP(row.allocated_spend)}</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className="font-bold text-red-600 text-base">{point}</span>
        <div className="text-[11px] text-amber-600 mt-0.5 tabular-nums">{lower} – {upper}</div>
      </TableCell>
    </TableRow>
  )
}

export default function BudgetAllocator() {
  const [state, formAction, isPending] = useActionState<AllocateState, FormData>(runBudgetAllocation, null)

  const result = state && 'result' in state ? state.result : null
  const error  = state && 'error'  in state ? state.error  : null

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        Enter a total budget. The system distributes it across your top ad sets, weighted by their historical purchase efficiency (purchases per peso spent), then projects purchases using the regression model.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Total Budget (PHP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">₱</span>
            <Input
              name="budget"
              type="number"
              min="1"
              step="0.01"
              placeholder="10000"
              required
              className="w-full pl-8 border-slate-200 focus-visible:ring-red-500 text-slate-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Allocating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
              </svg>
              Allocate Budget
            </>
          )}
        </button>
      </form>

      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-700">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className="rounded-2xl p-5 flex flex-wrap gap-6"
            style={{ background: 'linear-gradient(135deg, #1c0808 0%, #111 60%, #0d0d0d 100%)' }}>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-white">{formatPHP(result.total_budget)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Projected Purchases</p>
              <p className="text-2xl font-bold text-red-400">{Math.round(result.total_projected_purchases)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Projected CPA</p>
              <p className="text-2xl font-bold text-white">
                {result.total_projected_purchases > 0
                  ? formatPHP(result.total_budget / result.total_projected_purchases)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Ad Sets</p>
              <p className="text-2xl font-bold text-slate-200">{result.allocations.length}</p>
            </div>
            <div className="self-end ml-auto hidden sm:block">
              <p className="text-[11px] text-slate-400">
                {modelLabel(result.model_type)} · R² = {(result.model_r_squared * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Allocation table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="px-4 py-3 w-8 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">#</TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Ad Set</TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Share</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Allocated</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Proj. Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.allocations.map((row, i) => (
                  <AllocationRow key={row.ad_set_name} row={row} rank={i + 1} />
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-[11px] text-slate-400">
            Allocation weighted by historical purchase efficiency (purchases ÷ spend) per ad set. Projected purchases use the {modelLabel(result.model_type)} model with reach, messaging, and link clicks scaled from historical per-peso ratios (global average used as fallback when an ad set has no historical data for a metric). Approximate 80% prediction intervals shown below each purchase count (constant-width, based on model RSE).
          </p>
        </div>
      )}
    </div>
  )
}
