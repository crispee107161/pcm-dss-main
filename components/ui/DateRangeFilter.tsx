'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface DateRangeFilterProps {
  from?: string
  to?: string
  className?: string
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
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

function diffDaysInclusive(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

interface Preset {
  key: string
  label: string
  range: () => { from: string; to: string }
}

function buildPresets(): Preset[] {
  const today = new Date()
  const todayISO = toISODate(today)

  return [
    { key: 'last7d',  label: 'Last 7 days',    range: () => ({ from: toISODate(addDays(today, -6)), to: todayISO }) },
    { key: 'last30d', label: 'Last 30 days',   range: () => ({ from: toISODate(addDays(today, -29)), to: todayISO }) },
    { key: 'last90d', label: 'Last 90 days',   range: () => ({ from: toISODate(addDays(today, -89)), to: todayISO }) },
    { key: 'thisMonth', label: 'This month',   range: () => ({ from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayISO }) },
    { key: 'thisYear', label: 'This year',     range: () => ({ from: toISODate(new Date(today.getFullYear(), 0, 1)), to: todayISO }) },
    { key: 'last6mo', label: 'Last 6 months',  range: () => ({ from: toISODate(addMonths(today, -6)), to: todayISO }) },
    { key: 'last12mo', label: 'Last 12 months', range: () => ({ from: toISODate(addMonths(today, -12)), to: todayISO }) },
  ]
}

export default function DateRangeFilter({ from, to, className = '' }: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customOpen, setCustomOpen] = useState(false)

  const presets = useMemo(buildPresets, [])

  const setRange = useCallback((next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.from) params.set('from', next.from); else params.delete('from')
    if (next.to) params.set('to', next.to); else params.delete('to')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const activePreset = useMemo(() => {
    if (!from && !to) return null
    return presets.find(p => {
      const r = p.range()
      return r.from === from && r.to === to
    }) ?? null
  }, [from, to, presets])

  const activeLabel = !from && !to
    ? 'All time'
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
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous period"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={nextDisabled}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next period"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-card hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {activeLabel}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {presets.map(p => (
            <DropdownMenuItem key={p.key} onClick={() => { setCustomOpen(false); setRange(p.range()) }}>
              {p.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => { setCustomOpen(false); setRange({}) }}>
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
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
            aria-label="From date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            defaultValue={to ?? ''}
            onChange={e => setRange({ from, to: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  )
}
