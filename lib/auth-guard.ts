import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

// `auth()` re-checks is_active/is_locked in the DB on every call (see
// lib/auth.ts's jwt callback) — cache() collapses the layout+page(+route)
// calls that happen within a single request render into one query instead
// of two or three.
const getSession = cache(async (): Promise<Session | null> => auth())

// A session cookie can go stale mid-lifetime — the account behind it gets
// deactivated or locked (FR-02, SR-A6) — without the cookie itself becoming
// invalid, because middleware.ts's getToken() decodes the JWT directly and
// never touches the DB. auth() (via the jwt callback) is the one place that
// notices and returns null. A Server Component can't clear the cookie
// itself, so every null-session guard must redirect through
// /api/auth/invalidate (a Route Handler, which can) rather than straight to
// /login — otherwise middleware still trusts the stale cookie and bounces
// the user right back to /dashboard, looping forever. This was the cause of
// the 2026-09-03 production ERR_TOO_MANY_REDIRECTS incident.
//
// Role-mismatch redirects (a valid session, wrong role for this route) are
// a different case with no loop risk and should still `redirect('/login')`
// directly after calling this.
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session?.user) redirect('/api/auth/invalidate')
  return session
}

// SR-A8's "must change it before any other route is reachable" guarantee is
// enforced by middleware.ts for everything under /dashboard, but that
// matcher doesn't cover /api/reports/*/csv|pdf or /print/*/report — a
// temp-password session can hit those directly. Routes and pages outside
// /dashboard that read a session must call this instead of `auth()` so the
// same rule holds there too. Returns null only for the mustChangePassword
// case; a missing/invalidated session is already redirected by
// requireSession above.
export async function requireUsableSession(): Promise<Session | null> {
  const session = await requireSession()
  if (session.user.mustChangePassword) return null
  return session
}
