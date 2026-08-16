'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import type { BudgetReallocationResult } from '@/lib/stats/budget-reallocation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

// The reference thresholds verified in data_catalog.md §4.3 — the default
// (₱1,000) is provisional pending Chapter 1 (mvp.md §9, open item 1).
const THRESHOLD_OPTIONS = [300, 500, 1000]

export function MinSpendSelect({ value }: { value: number }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Select value={String(value)} onValueChange={v => router.push(`${pathname}?minSpend=${v}`)}>
      <SelectTrigger className="border-border text-foreground focus-visible:ring-ring w-auto min-w-[140px]">
        <SelectValue placeholder="Minimum spend" />
      </SelectTrigger>
      <SelectContent>
        {THRESHOLD_OPTIONS.map(t => (
          <SelectItem key={t} value={String(t)}>Spend ≥ {formatPHP(t)}</SelectItem>
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
        <p>{q.n} ads</p>
        <p className="sensitive">{formatPHP(q.spend)} spend</p>
        <p className="sensitive">{q.inquiries.toLocaleString()} inquiries</p>
      </div>
    </div>
  )
}

export function ReallocationSlider({ result }: { result: BudgetReallocationResult }) {
  const [pct, setPct] = useState(100)

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
          <p className="sensitive text-lg font-bold text-status-positive">+{Math.round(additionalAtPct).toLocaleString()}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
        Retrospective comparison of recorded results. Past efficiency does not guarantee the same rate at higher spend.
      </p>
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

      <div className="bg-card rounded-2xl card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            Q4 ads (n={result.q4Ads.length}) — worst cost per messaging conversation
          </p>
        </div>
        {result.q4Ads.length === 0 ? (
          <p className="text-muted-foreground text-sm p-6">No ads meet the minimum-spend threshold.</p>
        ) : (
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
                {result.q4Ads.map(a => (
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
        )}
      </div>
    </div>
  )
}
