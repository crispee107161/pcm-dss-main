'use server'

import { signIn, signOut, auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security-log'
import type { Role } from '@/types/index'

// MARKETING_TEAM has no dedicated route tree yet (mvp.md §3 S3/S6 are its
// screens) — lands on the marketing dashboard, view-only, until that ships.
const roleRoutes: Record<Role, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  MARKETING_TEAM: '/dashboard/marketing',
  BUSINESS_OWNER: '/dashboard/owner',
}

const LOGIN_ATTEMPT_LIMIT = 10
const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

// Looser cap keyed on email alone (no IP), so an attacker who spoofs
// x-forwarded-for to dodge the per-IP+email bucket still gets throttled
// against a single account.
const LOGIN_ATTEMPT_LIMIT_PER_EMAIL = 30
const LOGIN_ATTEMPT_WINDOW_MS_PER_EMAIL = 10 * 60 * 1000

export async function loginAction(
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // x-forwarded-for is trusted as-is: safe on Vercel (its edge network sets/
  // overwrites this header before the request reaches the app), but if this
  // is ever self-hosted behind a different or no reverse proxy, a client can
  // spoof this header to get a fresh rate-limit bucket on every request.
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'unknown'

  // Rate-limit per IP+email pair so one attacker can't lock out a real
  // user's email by spamming failed attempts against it from elsewhere,
  // while still throttling brute-force against a single account.
  const { allowed, retryAfterSeconds } = rateLimit(
    `login:${ip}:${email.toLowerCase()}`,
    LOGIN_ATTEMPT_LIMIT,
    LOGIN_ATTEMPT_WINDOW_MS
  )
  if (!allowed) {
    return { error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` }
  }

  const emailOnlyLimit = rateLimit(
    `login-email:${email.toLowerCase()}`,
    LOGIN_ATTEMPT_LIMIT_PER_EMAIL,
    LOGIN_ATTEMPT_WINDOW_MS_PER_EMAIL
  )
  if (!emailOnlyLimit.allowed) {
    return { error: `Too many login attempts. Try again in ${Math.ceil(emailOnlyLimit.retryAfterSeconds / 60)} minute(s).` }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
  } catch (err) {
    const message = (err as Error).message ?? ''
    if (message.includes('CredentialsSignin') || message.includes('credentials')) {
      return { error: 'Invalid email or password' }
    }
    return { error: 'An error occurred. Please try again.' }
  }

  // After sign in succeeds, get the session to redirect to correct dashboard
  const session = await auth()
  const role = session?.user?.role as Role | undefined

  if (role && roleRoutes[role]) {
    redirect(roleRoutes[role])
  }

  redirect('/login')
}

export async function logoutAction() {
  await logSignOut()
  await signOut({ redirect: false })
  redirect('/login?reason=logout')
}

// Distinct from logoutAction so only the automatic idle-timeout path shows
// the "signed out due to inactivity" notice — a user who explicitly clicks
// Sign Out already knows why they're back at /login.
export async function idleLogoutAction() {
  await logSignOut()
  await signOut({ redirect: false })
  redirect('/login?reason=idle')
}

async function logSignOut() {
  const session = await auth()
  if (!session?.user) return
  await logSecurityEvent({
    eventType: 'SIGN_OUT',
    userId: parseInt(session.user.id, 10),
    actorEmail: session.user.email,
    outcome: 'SUCCESS',
  })
}
