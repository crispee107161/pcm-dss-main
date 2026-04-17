'use client'

import { useActionState } from 'react'
import { loginAction } from '@/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">

      {/* Brand header */}
      <div className="text-center mb-8">
        <img src="/pcm-logo.png" alt="PC Merchandise" className="w-16 h-16 object-contain mx-auto mb-4" />
        <h1 className="text-3xl font-black text-white tracking-tight">PC Merchandise DSS</h1>
        <p className="text-zinc-500 text-sm mt-1">Decision Support System</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-lg font-bold text-white mb-6 text-center">Sign In to Continue</h2>

        {state?.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm transition-colors"
              placeholder="you@pcmerchandise.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-600 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors text-sm flex items-center justify-center gap-2 mt-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      

    </div>
  )
}
