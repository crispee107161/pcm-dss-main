'use client'

import { useActionState, useState } from 'react'
import { runCostCuttingScenario, type CostCuttingState } from '@/actions/cost-cutting'
import type { CostCutAdSet } from '@/lib/stats/cost-cutting'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

function AdSetRow({ row, tone }: { row: CostCutAdSet; tone: 'cut' | 'kept' }) {
  return (
    <TableRow className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
      <TableCell className="px-4 py-3">
        <div className="font-semibold text-gray-800 text-sm max-w-[180px] truncate" title={row.ad_set_name}>
          {row.ad_set_name}
        </div>
        <div className="sensitive text-[11px] text-gray-500 mt-0.5">
          Hist. CPI: {row.historical_cpi !== null ? formatPHP(row.historical_cpi) : '—'} · {row.historical_inquiries} past inquiries
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className="sensitive font-bold text-gray-800">{formatPHP(row.spend)}</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          tone === 'cut' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
        }`}>
          {tone === 'cut' ? 'Cut' : 'Keep'}
        </span>
      </TableCell>
    </TableRow>
  )
}

export default function CostCuttingScenario() {
  const [state, formAction, isPending] = useActionState<CostCuttingState, FormData>(runCostCuttingScenario, null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const result = state && 'result' in state ? state.result : null
  const error  = state && 'error'  in state ? state.error  : null

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Enter a target budget reduction. The system recommends which ad sets to cut — starting with the least efficient (fewest inquiries per peso, zero-inquiry ad sets first) — until the target savings is reached, and shows the resulting inquiry trade-off. Ad sets are cut whole, so the actual reduction may overshoot your target.
      </p>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label htmlFor="cost-cutting-reduction" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Target Reduction (%)
          </label>
          <div className="relative">
            <Input
              id="cost-cutting-reduction"
              name="reduction"
              type="number"
              min="1"
              max="99"
              step="1"
              placeholder="20"
              required
              className="w-full pr-8 border-gray-200 focus-visible:ring-ring text-gray-900"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">%</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/40 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Calculating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0v-8m0 8L4 4" />
              </svg>
              Recommend Cuts
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
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Spend Removed</p>
              <p className="sensitive text-2xl font-bold text-foreground">{formatPHP(result.spend_removed)}</p>
              <p className={`text-[11px] mt-0.5 ${
                result.actual_reduction_pct > result.target_reduction_pct * 1.25 ? 'text-red-600 font-semibold' : 'text-gray-400'
              }`}>
                {(result.actual_reduction_pct * 100).toFixed(1)}% of {formatPHP(result.total_spend)}
                {result.actual_reduction_pct > result.target_reduction_pct * 1.25 && (
                  <> — overshot the {(result.target_reduction_pct * 100).toFixed(0)}% target; ad sets can only be cut whole</>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Projected Inquiries (after)</p>
              <p className="sensitive text-2xl font-bold text-green-700 dark:text-green-400">
                {Math.round(result.after_cut_projected_inquiries)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                was {Math.round(result.baseline_projected_inquiries)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Inquiry Loss</p>
              <p className="sensitive text-2xl font-bold text-red-500">
                {(result.inquiry_loss_pct * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Ad Sets Cut</p>
              <p className="text-2xl font-bold text-foreground">{result.cut_ad_sets.length} / {result.cut_ad_sets.length + result.kept_ad_sets.length}</p>
            </div>
          </div>

          {/* Ad set table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-200">
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Ad Set</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Spend</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.cut_ad_sets.map(row => (
                  <AdSetRow key={row.ad_set_name} row={row} tone="cut" />
                ))}
                {result.kept_ad_sets.map(row => (
                  <AdSetRow key={row.ad_set_name} row={row} tone="kept" />
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
                Ad sets are ranked by historical inquiry efficiency (inquiries ÷ spend, Laplace-smoothed); zero-inquiry ad sets rank lowest and are cut first, then the next least efficient, until the target spend reduction is reached. Projected inquiries scale reach and messaging from each ad set&apos;s historical per-peso ratios (global average used as fallback) and run through the current regression model (R² = {(result.model_r_squared * 100).toFixed(1)}%).
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
