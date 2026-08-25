'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Plain DOM CustomEvent, not a React context — NavigationProgress
// (components/ui/NavigationProgress.tsx) already listens for real <a> clicks
// via document-level event delegation, so a matching window event lets
// button-driven navigation (filter tabs, date-range pickers) reuse the same
// bar without every caller needing a context provider between it and the
// root layout.
const START_EVENT = 'pcm:nav-progress-start'

export function startNavigationProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(START_EVENT))
  }
}

export function onNavigationProgressStart(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(START_EVENT, handler)
  return () => window.removeEventListener(START_EVENT, handler)
}

// Drop-in router for search-param-driven filters (date ranges, tabs) that
// call router.push/replace directly instead of rendering a real <Link>:
// starts the global top bar immediately and exposes isPending so the filter
// control itself can dim/disable for the same window, rather than looking
// like the click did nothing until the new RSC payload lands.
// A push/replace to the URL that's already active never fires NavigationProgress's
// pathname/searchParams-change effect, so without this guard the bar would
// start and then sit there until its own failsafe timeout — same bug class
// as a blocked/redirected-back navigation, just self-inflicted instead of
// server-inflicted.
function isSameUrl(href: string): boolean {
  if (typeof window === 'undefined') return false
  return href === `${window.location.pathname}${window.location.search}`
}

export function useProgressRouter() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const push = useCallback((href: string) => {
    if (!isSameUrl(href)) startNavigationProgress()
    startTransition(() => router.push(href))
  }, [router, startTransition])

  const replace = useCallback((href: string) => {
    if (!isSameUrl(href)) startNavigationProgress()
    startTransition(() => router.replace(href))
  }, [router, startTransition])

  return { push, replace, isPending }
}
