'use client'

import { useEffect, useState } from 'react'

/** Mirrors Sure's print layout: auto-open the browser print dialog shortly after the page loads.
 * Also renders a persistent, screen-only button so dismissing the dialog doesn't strand the user
 * without a way to retry short of reloading the tab.
 *
 * The `?pdf=1` query param marks this render as a headless-Chromium PDF capture pass
 * (see app/api/reports/[role]/pdf/route.ts) — window.print() has no real dialog to open
 * there, so it's skipped rather than risk the page hanging on it. */
export function AutoPrint() {
  const [isPdfCapture, setIsPdfCapture] = useState(false)

  useEffect(() => {
    setIsPdfCapture(new URLSearchParams(window.location.search).has('pdf'))
  }, [])

  useEffect(() => {
    if (isPdfCapture) return
    const timer = setTimeout(() => window.print(), 500)
    return () => clearTimeout(timer)
  }, [isPdfCapture])

  return (
    <div className="print:hidden sticky top-0 z-10 flex justify-end bg-white/90 backdrop-blur-sm border-b border-neutral-200 px-6 py-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        Print / Save as PDF
      </button>
    </div>
  )
}
