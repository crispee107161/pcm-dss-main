'use client'

import { useActionState, useState } from 'react'
import { loginAction } from '@/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <style>{`
        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(0.5deg); }
          50%       { transform: translateY(-9px) rotate(-1.5deg); }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50%       { transform: translateY(-18px) rotate(-0.5deg); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50%       { opacity: 0.32; transform: scale(1.08); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bar-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        .fa { animation: float-a 7s ease-in-out infinite; }
        .fb { animation: float-b 9s ease-in-out infinite 1.5s; }
        .fc { animation: float-c 8s ease-in-out infinite 3s; }
        .orb { animation: breathe 5s ease-in-out infinite; }
        .orb2 { animation: breathe 6s ease-in-out infinite 2s; }
        .r1 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .r2 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        .r3 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
        .r4 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
        .r5 { animation: rise 0.55s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
        .bar { transform-origin: bottom; animation: bar-grow 1.2s cubic-bezier(0.22,1,0.36,1) both; }
        .bar:nth-child(1) { animation-delay: 0.1s; }
        .bar:nth-child(2) { animation-delay: 0.2s; }
        .bar:nth-child(3) { animation-delay: 0.3s; }
        .bar:nth-child(4) { animation-delay: 0.15s; }
        .bar:nth-child(5) { animation-delay: 0.25s; }
        .bar:nth-child(6) { animation-delay: 0.35s; }
        input:focus-visible {
          border-color: #dc2626 !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.12), 0 0 24px rgba(220,38,38,0.08);
          outline: none;
        }
        .sign-in-btn:hover:not(:disabled) {
          box-shadow: 0 8px 32px rgba(220,38,38,0.35);
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
        .pw-toggle:hover { color: #f4f4f5; }
      `}</style>

      <div className="min-h-dvh flex" style={{ background: '#080808' }}>

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
          style={{ background: 'linear-gradient(145deg, #130000 0%, #0c0c0c 55%, #0a0000 100%)', borderRight: '1px solid rgba(63,63,70,0.4)' }}>

          {/* Grid */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.045 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ef4444" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>

          {/* Glow orbs */}
          <div className="orb absolute pointer-events-none"
            style={{ top: '20%', left: '15%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          <div className="orb2 absolute pointer-events-none"
            style={{ bottom: '20%', right: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <img src="/pcm-logo.png" alt="PCM" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-white font-bold text-sm leading-none">PC Merchandise</p>
              <p className="text-red-500 text-[10px] font-semibold tracking-[0.25em] uppercase mt-0.5">Decision Support System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative z-10 space-y-10">
            <div>
              <p className="text-red-600 text-[11px] font-bold tracking-[0.35em] uppercase mb-5">Ad Intelligence Platform</p>
              <h1 className="text-[3.5rem] font-black text-white leading-[1.02] tracking-[-0.03em]">
                Turn ad data<br />
                into <span style={{ color: '#ef4444' }}>decisions.</span>
              </h1>
              <p className="text-gray-500 text-sm mt-5 max-w-[280px] leading-relaxed">
                Predictive models, correlation analysis, and AI insights — purpose-built for PC Merchandise.
              </p>
            </div>

            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5" style={{ height: 56 }}>
              {[38, 52, 44, 68, 58, 72, 61].map((h, i) => (
                <div key={i} className="bar rounded-sm flex-1"
                  style={{ height: `${h}%`, background: i === 5 ? '#ef4444' : i === 6 ? '#dc2626' : 'rgba(239,68,68,0.25)' }} />
              ))}
              <p className="text-gray-500 text-[10px] ml-2 self-end pb-0.5">Page Views</p>
            </div>

            {/* Floating stat cards */}
            <div className="space-y-3">
              <div className="fa flex items-center gap-3.5 rounded-xl px-4 py-3 w-fit"
                style={{ background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(63,63,70,0.5)', backdropFilter: 'blur(8px)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,38,38,0.15)' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">Total Ad Reach</p>
                  <p className="text-white font-bold text-sm">847,293 people</p>
                </div>
              </div>

              <div className="fb flex items-center gap-3.5 rounded-xl px-4 py-3 w-fit ml-10"
                style={{ background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(63,63,70,0.5)', backdropFilter: 'blur(8px)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">Inquiries Tracked</p>
                  <p className="text-white font-bold text-sm">1,284 inquiries</p>
                </div>
              </div>

              <div className="fc flex items-center gap-3.5 rounded-xl px-4 py-3 w-fit ml-5"
                style={{ background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(63,63,70,0.5)', backdropFilter: 'blur(8px)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">Model Accuracy</p>
                  <p className="text-white font-bold text-sm">R² = 89.4%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <div className="mb-4" style={{ height: 1, background: 'linear-gradient(to right, rgba(220,38,38,0.5), transparent)' }} />
            <p className="text-gray-700 text-xs">© 2025 PC Merchandise · Confidential Internal Tool</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16 relative overflow-hidden" style={{ background: '#080808' }}>
          {/* Subtle ambient glow — matches left panel energy */}
          <div className="absolute pointer-events-none"
            style={{ bottom: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,28,28,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute pointer-events-none"
            style={{ top: '-5%', left: '-15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 70%)', filter: 'blur(50px)' }} />

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center r1 relative z-10">
            <img src="/pcm-logo.png" alt="PCM" className="w-12 h-12 object-contain mx-auto mb-3" />
            <p className="text-white font-black text-xl tracking-tight">PC Merchandise DSS</p>
          </div>

          <div className="w-full max-w-[340px] relative z-10">

            {/* Heading */}
            <div className="r1 mb-8">
              <h2 className="text-[2rem] font-black text-white tracking-tight leading-tight">Welcome back.</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your dashboard</p>
            </div>

            {/* Error */}
            {state?.error && (
              <div className="error-in mb-5 flex items-start gap-2.5 rounded-lg px-4 py-3"
                style={{ background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(153,27,27,0.6)' }}>
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{state.error}</p>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div className="r2">
                <label htmlFor="email" className="block text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(63,63,70,0.9)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-600 text-base sm:text-sm"
                  placeholder="you@pcmerchandise.com"
                />
              </div>

              <div className="r3">
                <label htmlFor="password" className="block text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(63,63,70,0.9)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    className="w-full px-4 py-3 pr-11 rounded-lg text-white placeholder-gray-600 text-base sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="pw-toggle absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 p-0.5"
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
                  className="sign-in-btn w-full rounded-lg px-4 py-3 font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
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

            <p className="r5 text-gray-700 text-xs text-center mt-8">
              Access restricted to authorized personnel only.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
