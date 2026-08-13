'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toISODate, diffDaysInclusive, lastCompleteMonth } from '@/lib/date-range'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

interface DateRangeFilterProps {
  from?: string
  to?: string
  className?: string
  // ISO date (YYYY-MM-DD) to anchor presets to, instead of the system clock.
  // The uploaded dataset is a fixed historical window (see mvp.md §4.7) —
  // today-relative presets like "Last 3 months" resolve to an empty range
  // once "today" has drifted past the data. Pass the latest date present in
  // the data (same anchor the owner dashboard already uses for its delta
  // window, owner/page.tsx) so every preset returns real rows. Omitted by
  // every other caller, which keeps their today-relative behavior unchanged.
  anchor?: string
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

interface Preset {
  key: string
  label: string
  range: () => { from: string; to: string }
}

function buildPresets(ref: Date): Preset[] {
  const refISO = toISODate(ref)

  return [
    { key: 'lastCompleteMonth', label: 'Last complete month', range: () => lastCompleteMonth(ref) },
    { key: 'last7d',  label: 'Last 7 days',    range: () => ({ from: toISODate(addDays(ref, -6)), to: refISO }) },
    { key: 'last30d', label: 'Last 30 days',   range: () => ({ from: toISODate(addDays(ref, -29)), to: refISO }) },
    { key: 'last90d', label: 'Last 90 days',   range: () => ({ from: toISODate(addDays(ref, -89)), to: refISO }) },
    { key: 'thisMonth', label: 'This month',   range: () => ({ from: toISODate(new Date(ref.getFullYear(), ref.getMonth(), 1)), to: refISO }) },
    { key: 'thisYear', label: 'This year',     range: () => ({ from: toISODate(new Date(ref.getFullYear(), 0, 1)), to: refISO }) },
    { key: 'last3mo', label: 'Last 3 months',  range: () => ({ from: toISODate(addMonths(ref, -3)), to: refISO }) },
    { key: 'last6mo', label: 'Last 6 months',  range: () => ({ from: toISODate(addMonths(ref, -6)), to: refISO }) },
    { key: 'last12mo', label: 'Last 12 months', range: () => ({ from: toISODate(addMonths(ref, -12)), to: refISO }) },
  ]
}

export default function DateRangeFilter({ from, to, className = '', anchor }: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customOpen, setCustomOpen] = useState(false)

  const refDate = anchor && ISO_DAY.test(anchor) ? new Date(`${anchor}T00:00:00`) : new Date()
  const presets = buildPresets(refDate)

  const setRange = useCallback((next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.from) params.set('from', next.from); else params.delete('from')
    if (next.to) params.set('to', next.to); else params.delete('to')
    // 'all' only means anything to a caller with a data-anchored default
    // (see setAllTime below) — always clear it here so picking any other
    // range supersedes a previously-chosen "All time".
    params.delete('all')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // When `anchor` is set, absent from/to means "use the default period"
  // (last complete month), not "all time" — so "All time" needs its own
  // explicit marker rather than just clearing the params, or it would be
  // indistinguishable from never having picked anything.
  const setAllTime = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    params.set('all', '1')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const activePreset = useMemo(() => {
    if (!from && !to) return null
    return presets.find(p => {
      const r = p.range()
      return r.from === from && r.to === to
    }) ?? null
  }, [from, to, presets])

  // Read straight from the URL rather than a prop — the same 'all' sentinel
  // setAllTime() writes above, so the label agrees with whichever branch the
  // page actually queried without the two having to be threaded separately.
  const isExplicitAllTime = searchParams.get('all') === '1'

  const activeLabel = isExplicitAllTime
    ? 'All time'
    : (!from && !to)
      ? (anchor ? 'Last complete month' : 'All time')
      : activePreset?.label ?? 'Custom range'

  const windowDays = from && to ? diffDaysInclusive(from, to) : null

  const goPrev = useCallback(() => {
    if (!from || !to || windowDays === null) return
    const newTo = addDays(new Date(from), -1)
    const newFrom = addDays(newTo, -(windowDays - 1))
    setRange({ from: toISODate(newFrom), to: toISODate(newTo) })
  }, [from, to, windowDays, setRange])

  const goNext = useCallback(() => {
    if (!from || !to || windowDays === null) return
    const todayISO = toISODate(new Date())
    const newFrom = addDays(new Date(to), 1)
    const newTo = addDays(newFrom, windowDays - 1)
    const cappedTo = toISODate(newTo) > todayISO ? new Date() : newTo
    setRange({ from: toISODate(newFrom), to: toISODate(cappedTo) })
  }, [from, to, windowDays, setRange])

  const nextDisabled = windowDays === null || (to !== undefined && to >= toISODate(new Date()))

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={windowDays === null}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous period"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next period"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-1.5 text-foreground bg-card hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {activeLabel}
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {presets.map(p => (
            <DropdownMenuItem key={p.key} onClick={() => { setCustomOpen(false); setRange(p.range()) }}>
              {p.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => { setCustomOpen(false); anchor ? setAllTime() : setRange({}) }}>
            All time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCustomOpen(true)}>
            Custom range&hellip;
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(customOpen || (activeLabel === 'Custom range')) && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            defaultValue={from ?? ''}
            onChange={e => setRange({ from: e.target.value, to })}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            defaultValue={to ?? ''}
            onChange={e => setRange({ from, to: e.target.value })}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  )
}
