'use client'

import { useActionState, useEffect, useRef, useState, Suspense } from 'react'
import type { KeyboardEvent } from 'react'
import { loginAction } from '@/actions/auth'
import { SessionNotice } from '@/components/login/SessionNotice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.error) {
      emailRef.current?.focus()
    }
  }, [state?.error])

  const handleCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/login" className="flex items-center gap-2 self-center font-medium text-foreground">
          <img src="/pcm-logo.png" alt="" className="size-6 object-contain" />
          PCM <span className="text-muted-foreground font-normal">Decision Support</span>
        </a>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {!state?.error && (
            <Suspense fallback={null}>
              <SessionNotice />
            </Suspense>
          )}

          {state?.error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-md px-4 py-3"
              style={{ background: 'color-mix(in srgb, var(--color-red-900) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--color-red-700) 70%, transparent)' }}
            >
              <svg aria-hidden="true" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{state.error}</p>
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
          Access restricted to authorized personnel only.
        </p>
      </div>
    </div>
  )
}
