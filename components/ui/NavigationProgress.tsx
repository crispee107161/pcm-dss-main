'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { onNavigationProgressStart } from '@/lib/navigation-progress'

// Starts the bar the instant a same-origin link is clicked (before the RSC
// payload even starts streaming), then completes it once the App Router
// finishes committing the new pathname/search — gives every navigation
// (sidebar links, filter tabs, pagination) an instant "the system heard you"
// signal instead of a frozen screen during the server round-trip.
function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const routeKey = `${pathname}?${searchParams.toString()}`
  const prevRouteKey = useRef(routeKey)

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    if (failsafeRef.current) clearTimeout(failsafeRef.current)
  }, [])

  const finishRef = useRef<() => void>(() => {})

  const start = useCallback(() => {
    clearTimers()
    setVisible(true)
    setProgress(12)
    // Eases toward 88% and stalls there — never claims completion until the
    // real navigation lands, but keeps visibly creeping so long RSC fetches
    // (an analytics page re-querying Postgres) don't look stuck. Clears
    // itself once it hits the ceiling instead of ticking a no-op forever.
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) {
          if (tickRef.current) clearInterval(tickRef.current)
          return p
        }
        return p + (88 - p) * 0.15
      })
    }, 200)
    // Failsafe: a navigation that never actually changes the URL (blocked by
    // middleware and redirected back to the same route, a push to the
    // already-active URL, an aborted/errored RSC fetch) would otherwise leave
    // the bar parked at 88% forever, since finish() only fires from a
    // pathname/searchParams change below.
    failsafeRef.current = setTimeout(() => finishRef.current(), 8000)
  }, [clearTimers])

  const finish = useCallback(() => {
    clearTimers()
    setProgress(100)
    hideRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 220)
  }, [clearTimers])
  finishRef.current = finish

  useEffect(() => {
    if (prevRouteKey.current !== routeKey) {
      prevRouteKey.current = routeKey
      finish()
    }
  }, [routeKey, finish])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search
      if (url.origin !== window.location.origin || samePage) return

      start()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [start])

  // Button-driven navigation (search-param filters via useProgressRouter)
  // can't be caught by the click listener above — it dispatches this event
  // itself instead of clicking a real <a>.
  useEffect(() => onNavigationProgressStart(start), [start])

  useEffect(() => clearTimers, [clearTimers])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full transition-[width] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 70%, transparent), var(--primary))',
          boxShadow: '0 0 10px color-mix(in srgb, var(--primary) 65%, transparent)',
        }}
      />
    </div>
  )
}

export default function NavigationProgress() {
  return (
    // useSearchParams requires a Suspense boundary at build time; the
    // fallback never actually paints since the bar starts invisible anyway.
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  )
}
