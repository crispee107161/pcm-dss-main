'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface DateRangeFilterProps {
  from?: string
  to?: string
  className?: string
}

export default function DateRangeFilter({ from, to, className = '' }: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback((key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const clear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filter</span>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          defaultValue={from ?? ''}
          onChange={e => update('from', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
          aria-label="From date"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          defaultValue={to ?? ''}
          onChange={e => update('to', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
          aria-label="To date"
        />
      </div>
      {(from || to) && (
        <button
          onClick={clear}
          className="text-xs text-primary hover:text-green-700 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Clear
        </button>
      )}
    </div>
  )
}
