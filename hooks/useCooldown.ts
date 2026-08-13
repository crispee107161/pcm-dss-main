'use client'

import { useEffect, useState, useCallback } from 'react'

// Shared client-side cooldown timer for rate-limited AI actions (Manage
// Keywords' "Analyze Content", Categorization Review's "Classify with AI").
// Persists an absolute deadline (not a countdown number) to localStorage so
// the cooldown survives navigating away and back, then re-derives the
// remaining seconds from that deadline on every tick — self-correcting, no
// drift, unlike a naive `c => c - 1` decrement.
function readRemaining(storageKey: string): number {
  if (typeof window === 'undefined') return 0
  const until = Number(window.localStorage.getItem(storageKey))
  if (!until) return 0
  return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

export function useCooldown(storageKey: string) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  // Reconcile against localStorage after mount, not in useState's
  // initializer, so this still matches the server-rendered markup and
  // avoids a hydration mismatch.
  useEffect(() => {
    setSecondsLeft(readRemaining(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft(readRemaining(storageKey)), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft > 0, storageKey])

  const begin = useCallback((seconds: number) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(Date.now() + seconds * 1000))
    }
    setSecondsLeft(seconds)
  }, [storageKey])

  return { secondsLeft, begin }
}
