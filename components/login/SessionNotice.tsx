'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'

type Tone = 'neutral' | 'success'

const REASON_INFO: Record<string, { message: string; tone: Tone }> = {
  logout: { message: "You've been signed out.", tone: 'success' },
  idle: { message: 'You were signed out after 15 minutes of inactivity.', tone: 'neutral' },
  expired: { message: 'Your session expired. Please sign in again.', tone: 'neutral' },
}

const AUTO_DISMISS_MS = 3000
const EXIT_ANIMATION_MS = 180

export function SessionNotice() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const info = reason ? REASON_INFO[reason] : undefined

  const [isVisible, setIsVisible] = useState(true)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (!info) return

    setIsVisible(true)
    setIsLeaving(false)

    const dismissTimer = setTimeout(() => setIsLeaving(true), AUTO_DISMISS_MS)
    return () => clearTimeout(dismissTimer)
  }, [info])

  useEffect(() => {
    if (!isLeaving) return

    const unmountTimer = setTimeout(() => setIsVisible(false), EXIT_ANIMATION_MS)
    return () => clearTimeout(unmountTimer)
  }, [isLeaving])

  if (!info || !isVisible || typeof document === 'undefined') return null

  const isSuccess = info.tone === 'success'

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 flex max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 shadow-lg ${
        isLeaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
      style={{
        background: isSuccess
          ? 'color-mix(in srgb, var(--status-positive) 12%, var(--card))'
          : 'color-mix(in srgb, white 6%, var(--card))',
        border: isSuccess
          ? '1px solid color-mix(in srgb, var(--status-positive) 35%, transparent)'
          : '1px solid var(--border)',
      }}
    >
      {isSuccess ? (
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-positive)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <p className={`flex-1 text-sm ${isSuccess ? '' : 'text-muted-foreground'}`} style={isSuccess ? { color: 'var(--status-positive)' } : undefined}>
        {info.message}
      </p>
      <button
        type="button"
        onClick={() => setIsLeaving(true)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-md p-0.5 text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body
  )
}
