'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useProgressRouter } from '@/lib/navigation-progress'
import { sortQ4WorstFirst, type BudgetReallocationResult } from '@/lib/stats/budget-reallocation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

// The reference thresholds verified in data_catalog.md §4.3 — the default
// (₱1,000) is provisional pending Chapter 1 (mvp.md §9, open item 1).
const THRESHOLD_OPTIONS = [300, 500, 1000]

// SelectValue's default label lookup depends on the popup's SelectItems having
// registered into base-ui's internal store, which only happens once the popup
// has mounted (i.e. after the Select is opened at least once) — until then it
// falls back to the raw value. Since `value` is set from a URL param on
// mount, resolving the label ourselves keeps the trigger text correct from
// first paint instead of showing a raw number until first click.
function minSpendLabel(value: string | null): string {
  if (value === null) return 'Minimum spend'
  const t = Number(value)
  return THRESHOLD_OPTIONS.includes(t) ? `Spend ≥ ${formatPHP(t)}` : value
}

export function MinSpendSelect({ value }: { value: number }) {
  const { push, isPending } = useProgressRouter()
  const pathname = usePathname()

  return (
    <Select value={String(value)} onValueChange={v => push(`${pathname}?minSpend=${v}`)}>
      <SelectTrigger disabled={isPending} className="border-border text-foreground focus-visible:ring-ring w-auto min-w-[140px]">
        {/* minSpendLabel already resolves null to "Minimum spend", so the
            placeholder prop below would never actually render. */}
        <SelectValue>{minSpendLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {THRESHOLD_OPTIONS.map(t => (
          <SelectItem key={t} value={String(t)} label={`Spend ≥ ${formatPHP(t)}`}>Spend ≥ {formatPHP(t)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const QUARTILE_STYLE: Record<1 | 2 | 3 | 4, string> = {
  1: 'border-t-status-positive',
  2: 'border-t-border',
  3: 'border-t-border',
  4: 'border-t-status-warning',
}

function QuartileCard({ q }: { q: BudgetReallocationResult['quartiles'][number] }) {
  return (
    <div className={`bg-card rounded-2xl card-shadow p-5 border-t-2 ${QUARTILE_STYLE[q.quartile]}`}>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
        Q{q.quartile} {q.quartile === 1 ? '(best)' : q.quartile === 4 ? '(worst)' : ''}
      </p>
      <p className="sensitive text-2xl font-bold text-foreground mt-1">{q.n > 0 ? formatPHP(q.cpi) : '—'}</p>
      <p className="text-xs text-muted-foreground mt-1">cost per messaging conversation</p>
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
        <p>{q.n} advertisements</p>
        <p className="sensitive">{formatPHP(q.spend)} spend</p>
        <p className="sensitive">{q.inquiries.toLocaleString()} inquiries</p>
      </div>
    </div>
  )
}

// Defaults below 100% (docs/raven/Budget_Reallocation_Review.md §2): landing
// on the maximum possible claim on first paint overstates before the user
// has done anything.
const DEFAULT_REALLOCATION_PCT = 50

export function ReallocationSlider({ result }: { result: BudgetReallocationResult }) {
  const [pct, setPct] = useState(DEFAULT_REALLOCATION_PCT)

  const reallocatedSpend = (result.q4Spend * pct) / 100
  const additionalAtPct = (result.additionalInquiries * pct) / 100
  const projectedInquiries = result.q4Inquiries + additionalAtPct

  return (
    <div className="bg-card rounded-2xl card-shadow p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
          Reallocation comparison
        </p>
        <span className="text-sm font-bold text-foreground">{pct}% of Q4 spend</span>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Drag to compare a different share of Q4&apos;s spend</p>
        <Slider
          min={0}
          max={100}
          step={5}
          stops={[0, 25, 50, 75, 100]}
          value={pct}
          onValueChange={next => setPct(next)}
          formatValue={v => `${v}%`}
          aria-label="Percentage of Q4 spend to compare at Q1's rate"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Spend compared</p>
          <p className="sensitive text-lg font-bold text-foreground">{formatPHP(reallocatedSpend)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Would have generated at Q1&apos;s rate</p>
          <p className="sensitive text-lg font-bold text-foreground">{Math.round(projectedInquiries).toLocaleString()} inquiries</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Additional, based on recorded results</p>
          {/* Neutral, not text-status-positive (docs/raven/Budget_Reallocation_Review.md
              §2): green reads as a promise, but this is a retrospective
              comparison, not a recommendation. */}
          <p className="sensitive text-lg font-bold text-foreground">+{Math.round(additionalAtPct).toLocaleString()}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
        Retrospective comparison of recorded results. Past efficiency does not guarantee the same rate at higher spend.
      </p>
    </div>
  )
}

// Shows the worst 10 by default, the rest behind a toggle (docs/raven/
// Budget_Reallocation_Review.md §5) — the operational value is in the worst
// few, and the full list stays available rather than foregrounded. Mirrors
// the show-all pattern in ResidualDiagnosticTable.tsx.
const Q4_TABLE_COLLAPSED_COUNT = 10

function Q4Table({ q4Ads }: { q4Ads: BudgetReallocationResult['q4Ads'] }) {
  const [showAll, setShowAll] = useState(false)
  const worstFirst = sortQ4WorstFirst(q4Ads)
  const visible = showAll ? worstFirst : worstFirst.slice(0, Q4_TABLE_COLLAPSED_COUNT)
  const hasMore = q4Ads.length > Q4_TABLE_COLLAPSED_COUNT

  return (
    <div className="bg-card rounded-2xl card-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
          Worst-performing advertisements ({q4Ads.length} total)
        </p>
      </div>
      {q4Ads.length === 0 ? (
        <p className="text-muted-foreground text-sm p-6">No advertisements meet the minimum-spend threshold.</p>
      ) : (
        <>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 border-b border-border">
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad Name</TableHead>
                  <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad Set</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Spend</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Inquiries</TableHead>
                  <TableHead className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">CPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(a => (
                  <TableRow key={a.ad_id} className="border-t border-border hover:bg-secondary/50/50 transition-colors">
                    <TableCell className="px-4 py-3">
                      <span className="font-medium text-foreground text-sm max-w-xs truncate block" title={a.ad_name}>{a.ad_name}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-xs text-muted-foreground truncate block" title={a.ad_set_name}>{a.ad_set_name}</span>
                    </TableCell>
                    <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(a.spend)}</TableCell>
                    <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{a.inquiries.toLocaleString()}</TableCell>
                    <TableCell className="sensitive px-4 py-3 text-right font-semibold text-foreground">{formatPHP(a.cpi)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasMore && (
            <div className="border-t border-border px-5 py-3 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {showAll ? `All ${q4Ads.length} advertisements` : `Showing the worst ${Q4_TABLE_COLLAPSED_COUNT} of ${q4Ads.length}`}
              </p>
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showAll ? (
                  <> Show less <span>▲</span> </>
                ) : (
                  <> Show all {q4Ads.length} advertisements <span>▼</span> </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function BudgetReallocationView({ result }: { result: BudgetReallocationResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {result.quartiles.map(q => <QuartileCard key={q.quartile} q={q} />)}
      </div>

      <ReallocationSlider result={result} />

      <Q4Table q4Ads={result.q4Ads} />
    </div>
  )
}
