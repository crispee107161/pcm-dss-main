'use client'

import { useActionState, useState } from 'react'
import { runBudgetAllocation, type AllocateState } from '@/actions/allocate'
import type { AdSetAllocation } from '@/lib/stats/budget-allocator'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

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
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 tabular-nums">{(pct * 100).toFixed(1)}%</span>
    </div>
  )
}

function AllocationRow({ row, rank }: { row: AdSetAllocation; rank: number }) {
  const point = Math.round(row.projected_inquiries)
  const lower = Math.round(row.interval_lower)
  const upper = Math.round(row.interval_upper)

  return (
    <TableRow className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
      <TableCell className="px-4 py-3 text-gray-400 text-xs w-8">{rank}</TableCell>
      <TableCell className="px-4 py-3">
        <div className="font-semibold text-gray-800 text-sm max-w-[180px] truncate" title={row.ad_set_name}>
          {row.ad_set_name}
        </div>
        <div className="sensitive text-[11px] text-gray-500 mt-0.5">
          Hist. CPI: {row.historical_cpi !== null ? formatPHP(row.historical_cpi) : '—'} · {row.historical_inquiries} past inquiries
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <PctBar pct={row.pct} />
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className="sensitive font-bold text-gray-800">{formatPHP(row.allocated_spend)}</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className="sensitive font-bold text-green-600 text-base">{point}</span>
        <div className="sensitive text-[11px] text-amber-600 mt-0.5 tabular-nums">{lower} – {upper}</div>
      </TableCell>
    </TableRow>
  )
}

export default function BudgetAllocator() {
  const [state, formAction, isPending] = useActionState<AllocateState, FormData>(runBudgetAllocation, null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const result = state && 'result' in state ? state.result : null
  const error  = state && 'error'  in state ? state.error  : null

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Enter a total budget. The system distributes it across your top ad sets, weighted by their historical inquiry efficiency (inquiries per peso spent), then projects inquiries using the regression model.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label htmlFor="budget-allocator-total" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Total Budget (PHP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₱</span>
            <Input
              id="budget-allocator-total"
              name="budget"
              type="number"
              min="1"
              step="0.01"
              placeholder="10000"
              required
              className="w-full pl-8 border-gray-200 focus-visible:ring-ring text-gray-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-green-600 active:bg-green-700 disabled:bg-green-300 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
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
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className="rounded-2xl p-5 flex flex-wrap gap-6 bg-card card-shadow border-t-2 border-primary">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Total Budget</p>
              <p className="sensitive text-2xl font-bold text-foreground">{formatPHP(result.total_budget)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Projected Inquiries</p>
              <p className="sensitive text-2xl font-bold text-green-700 dark:text-green-400">{Math.round(result.total_projected_inquiries)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Projected CPI</p>
              <p className="sensitive text-2xl font-bold text-foreground">
                {result.total_projected_inquiries > 0
                  ? formatPHP(result.total_budget / result.total_projected_inquiries)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Ad Sets</p>
              <p className="text-2xl font-bold text-foreground">{result.allocations.length}</p>
            </div>
          </div>

          {/* Allocation table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-200">
                  <TableHead className="px-4 py-3 w-8 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">#</TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Ad Set</TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Share</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Allocated</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Proj. Inquiries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.allocations.map((row, i) => (
                  <AllocationRow key={row.ad_set_name} row={row} rank={i + 1} />
                ))}
              </TableBody>
            </Table>
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none">
              <svg
                className={`w-3 h-3 flex-shrink-0 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              See the model behind this
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <p className="text-[11px] text-gray-400">
                {modelLabel(result.model_type)} model · R² = {(result.model_r_squared * 100).toFixed(1)}%. Allocation weighted by historical inquiry efficiency (inquiries ÷ spend) per ad set. Projected inquiries use reach, messaging, and link clicks scaled from historical per-peso ratios (global average used as fallback when an ad set has no historical data for a metric). Approximate 80% prediction intervals shown below each inquiry count (constant-width, based on model RSE).
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
