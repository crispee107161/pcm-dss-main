'use client'

import { useActionState, useState } from 'react'
import { loginAction } from '@/actions/auth'
import { FloatingStatCards } from '@/components/login/FloatingStatCards'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50%       { opacity: 0.32; transform: scale(1.08); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bar-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        .orb { animation: breathe 5s ease-in-out infinite; }
        .orb2 { animation: breathe 6s ease-in-out infinite 2s; }
        .card-rise { animation: card-rise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .r1 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .r2 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
        .r3 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.26s both; }
        .r4 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.34s both; }
        .r5 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
        .bar { transform-origin: bottom; animation: bar-grow 1.2s cubic-bezier(0.22,1,0.36,1) both; }
        .bar:nth-child(1) { animation-delay: 0.1s; }
        .bar:nth-child(2) { animation-delay: 0.2s; }
        .bar:nth-child(3) { animation-delay: 0.3s; }
        .bar:nth-child(4) { animation-delay: 0.15s; }
        .bar:nth-child(5) { animation-delay: 0.25s; }
        .bar:nth-child(6) { animation-delay: 0.35s; }
        input:focus-visible {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent), 0 0 24px color-mix(in srgb, var(--primary) 8%, transparent);
          outline: none;
        }
        .sign-in-btn:hover:not(:disabled) {
          box-shadow: 0 8px 32px color-mix(in srgb, var(--primary) 35%, transparent);
          transform: translateY(-1px);
        }
        .sign-in-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .sign-in-btn { transition: box-shadow 0.2s, transform 0.2s; }
        @keyframes error-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .error-in { animation: error-in 0.2s cubic-bezier(0.22,1,0.36,1) both; }
        .pw-toggle { transition: color 0.15s; }
        .pw-toggle:hover { color: var(--foreground); }
      `}</style>

      <div className="min-h-dvh flex" style={{ background: 'var(--background)' }}>

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
          style={{
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--primary) 10%, var(--background)) 0%, var(--background) 55%, color-mix(in srgb, var(--primary) 6%, black) 100%)',
            borderRight: '1px solid var(--border)',
          }}>

          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.045 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--primary)" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>

          {/* Glow orbs */}
          <div className="orb absolute pointer-events-none"
            style={{ top: '20%', left: '15%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          <div className="orb2 absolute pointer-events-none"
            style={{ bottom: '20%', right: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 15%, transparent) 0%, transparent 70%)', filter: 'blur(40px)' }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <img src="/pcm-logo.png" alt="PCM" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-foreground font-bold text-sm leading-none">PC Merchandise</p>
              <p className="text-primary text-[10px] font-semibold tracking-[0.25em] uppercase mt-0.5">Decision Support System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative z-10 space-y-10">
            <div>
              <p className="text-primary text-[11px] font-bold tracking-[0.35em] uppercase mb-5">Ad Intelligence Platform</p>
              <h1 className="text-[3.5rem] font-black text-foreground leading-[1.02] tracking-[-0.03em]">
                Turn ad data<br />
                into <span className="text-primary">decisions.</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-5 max-w-[280px] leading-relaxed">
                Track performance, spot trends, and know what's working — purpose-built for PC&nbsp;Merchandise.
              </p>
            </div>

            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5" style={{ height: 56 }}>
              {[38, 52, 44, 68, 58, 72, 61].map((h, i) => (
                <div key={i} className="bar rounded-sm flex-1"
                  style={{ height: `${h}%`, background: i >= 5 ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 25%, transparent)' }} />
              ))}
              <p className="text-muted-foreground text-[10px] ml-2 self-end pb-0.5">Page Views</p>
            </div>

            {/* Floating stat cards (pointer tilt lives in the component) */}
            <FloatingStatCards />
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <div className="mb-4" style={{ height: 1, background: 'linear-gradient(to right, color-mix(in srgb, var(--primary) 50%, transparent), transparent)' }} />
            <p className="text-muted-foreground text-xs">© 2025 PC Merchandise · Confidential Internal Tool</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16 relative overflow-hidden" style={{ background: 'var(--background)' }}>
          {/* Subtle ambient glow — matches left panel energy */}
          <div className="absolute pointer-events-none"
            style={{ bottom: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 7%, transparent) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute pointer-events-none"
            style={{ top: '-5%', left: '-15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 4%, transparent) 0%, transparent 70%)', filter: 'blur(50px)' }} />

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center r1 relative z-10">
            <img src="/pcm-logo.png" alt="PCM" className="w-12 h-12 object-contain mx-auto mb-3" />
            <p className="text-foreground font-black text-xl tracking-tight">PC Merchandise DSS</p>
          </div>

          <div
            className="card-rise w-full max-w-[400px] relative z-10 rounded-2xl p-6 sm:p-8"
            style={{
              background: 'color-mix(in srgb, var(--card) 72%, transparent)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.04)',
                '0 24px 60px -12px rgba(0,0,0,0.72)',
                '0 0 48px -12px color-mix(in srgb, var(--primary) 10%, transparent)',
              ].join(', '),
            }}
          >

            {/* Heading */}
            <div className="r1 mb-8">
              <h2 className="text-[2rem] font-black text-foreground tracking-tight leading-tight">Welcome back.</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your dashboard</p>
            </div>

            {/* Error */}
            {state?.error && (
              <div className="error-in mb-5 flex items-start gap-2.5 rounded-lg px-4 py-3"
                style={{ background: 'color-mix(in srgb, var(--color-red-900) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--color-red-700) 70%, transparent)' }}>
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div className="r2">
                <label htmlFor="email" className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[0.14em] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  style={{ background: 'color-mix(in srgb, white 7%, transparent)', border: '1px solid var(--border)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  className="w-full px-4 py-3 rounded-lg text-foreground placeholder-muted-foreground text-base sm:text-sm"
                  placeholder="you@pcmerchandise.com"
                />
              </div>

              <div className="r3">
                <label htmlFor="password" className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[0.14em] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    style={{ background: 'color-mix(in srgb, white 7%, transparent)', border: '1px solid var(--border)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    className="w-full px-4 py-3 pr-11 rounded-lg text-foreground placeholder-muted-foreground text-base sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="pw-toggle absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="r4 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="sign-in-btn w-full rounded-lg px-4 py-3 font-bold text-sm text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, var(--color-crimson-500) 0%, var(--color-crimson-700) 100%)' }}
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="r5 text-muted-foreground text-xs text-center mt-8">
              Access restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
