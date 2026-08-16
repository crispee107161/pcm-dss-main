'use client'

import { useActionState, useEffect, useRef, useState, Suspense } from 'react'
import type { KeyboardEvent } from 'react'
import { useTheme } from 'next-themes'
import { loginAction } from '@/actions/auth'
import { SessionNotice } from '@/components/login/SessionNotice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  // Local toggle, scoped to this page (see the div className below) — but its
  // *default* should still follow the app-wide next-themes preference rather
  // than being hardcoded, so a user who set the app to light doesn't land on
  // a dark login screen. next-themes applies the resolved theme's class to
  // <html> before paint (via its blocking inline script), so reading that
  // class synchronously in the useState initializer avoids a light-flash for
  // a dark-mode user. That read is necessarily server/client-divergent
  // (SSR has no `document`), so the wrapper div below carries
  // suppressHydrationWarning deliberately — same escape hatch next-themes'
  // own docs recommend for this exact "themed root node" problem. Everything
  // else that depends on darkMode (the toggle button's label/icon) instead
  // gates on `mounted`, which is a plain useState(false) with no SSR/client
  // divergence, so those stay hydration-safe without needing the same
  // suppression, following the pattern already used in ThemeToggle.tsx.
  const { resolvedTheme } = useTheme()
  const [darkMode, setDarkMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )
  const [mounted, setMounted] = useState(false)
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (resolvedTheme) {
      setDarkMode(resolvedTheme === 'dark')
    }
  }, [resolvedTheme])

  useEffect(() => {
    if (state?.error) {
      emailRef.current?.focus()
    }
  }, [state?.error])

  const handleCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  return (
    // Scoped to this page only, defaulting to the app-wide next-themes
    // preference (see the darkMode initializer above; components/nav/
    // ThemeToggle.tsx is the app-wide toggle this mirrors on first paint).
    // suppressHydrationWarning: darkMode's initializer reads <html>'s class
    // synchronously to avoid a theme flash, which is intentionally
    // server/client-divergent — see the comment above.
    // `text-foreground` is load-bearing, not redundant with `bg-background`:
    // body sets `color: var(--foreground)` globally (globals.css), which
    // resolves once at <body> using the *ancestor* theme and is then
    // inherited as an already-resolved color into anything here that doesn't
    // set its own color (e.g. FieldLabel). Re-declaring it here forces a
    // fresh resolution under this div's own `.dark`/`.theme-light` class —
    // remove it and labels/typed input text go invisible again.
    // `.theme-light` (not an empty class) is required for the toggle's light
    // state to actually win over a possible ancestor `.dark` on <html> — see
    // the `.theme-light` rule in globals.css for why a plain removal isn't
    // enough.
    <div
      suppressHydrationWarning
      className={`${darkMode ? 'dark' : 'theme-light'} relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground p-6 md:p-10`}
    >
      {/* Portal target for SessionNotice — must live inside this themed
          subtree; portaling to document.body would render it against the
          app's ancestor theme instead of this page's local one. */}
      <div ref={setPortalNode} />

      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/login" className="flex items-center gap-2 self-center font-medium text-foreground">
          <img src="/pcm-logo.png" alt="" className="size-6 object-contain" />
          PCM <span className="text-muted-foreground font-normal">Decision Support</span>
        </a>

        <div className="rounded-xl border bg-card p-6 shadow-border-lg">
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Sign In to Continue
            </p>
          </div>

          {!state?.error && (
            <Suspense fallback={null}>
              <SessionNotice container={portalNode} />
            </Suspense>
          )}

          {state?.error && (
            <div
              role="alert"
              className="mt-6 flex flex-col gap-1.5 rounded-md px-4 py-3"
              style={{ background: 'color-mix(in srgb, var(--destructive) 8%, var(--card))', border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)' }}
            >
              <div className="flex items-start gap-2.5">
                <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--destructive)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--destructive)' }}>{state.error}</p>
              </div>
              <p className="ml-[26px] text-xs text-muted-foreground">
                Locked out? <span className="font-medium underline underline-offset-4" style={{ color: 'var(--destructive)' }}>Contact your administrator</span>.
              </p>
            </div>
          )}

          <form action={formAction} className="mt-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    onKeyUp={handleCapsLock}
                    onKeyDown={handleCapsLock}
                    placeholder="Enter your password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p
                  aria-live="polite"
                  className="text-[11px] mt-1 h-3.5"
                  style={{ color: 'var(--status-warning)', visibility: capsLock ? 'visible' : 'hidden' }}
                >
                  Caps Lock is on
                </p>
              </Field>

              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Signing in…' : 'Sign In'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>

        <p className="text-muted-foreground text-xs text-center">
          Access restricted to authorized personnel only. Need an account? Contact your administrator.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setDarkMode(v => !v)}
        aria-label={mounted ? (darkMode ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'}
        title={mounted ? (darkMode ? 'Switch to light theme' : 'Switch to dark theme') : undefined}
        className="absolute right-4 top-4 md:right-6 md:top-6 w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
      >
        {!mounted ? (
          <span className="w-4 h-4" />
        ) : darkMode ? (
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        )}
      </button>
    </div>
  )
}
