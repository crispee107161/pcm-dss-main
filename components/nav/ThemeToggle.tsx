'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const CYCLE = ['light', 'dark', 'system'] as const
type ThemeChoice = (typeof CYCLE)[number]

const LABELS: Record<ThemeChoice, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid a hydration mismatch: next-themes only knows the real
  // preference client-side, so render a neutral placeholder until mounted.
  useEffect(() => {
    setMounted(true)
  }, [])

  const current = (mounted ? (theme as ThemeChoice) : 'system') ?? 'system'

  function cycleTheme() {
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
    setTheme(next)
  }

  return (
    <button
      onClick={cycleTheme}
      aria-label={mounted ? `${LABELS[current]} — click to change` : 'Change theme'}
      title={mounted ? LABELS[current] : undefined}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0"
    >
      {!mounted ? (
        <span className="w-4 h-4" />
      ) : current === 'light' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : current === 'dark' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      ) : (
        <>
          {/* Desktop: "system" reads as the monitor you're using */}
          <svg className="w-4 h-4 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="4.5" width="18" height="12" rx="1.5" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 20h8M12 16.5V20" />
          </svg>
          {/* Mobile: a monitor doesn't match the device in your hand — use a phone instead */}
          <svg className="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="7" y="2.25" width="10" height="19.5" rx="2" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 18.75h2" />
          </svg>
        </>
      )}
    </button>
  )
}
