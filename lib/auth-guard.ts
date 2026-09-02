import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

// SR-A8's "must change it before any other route is reachable" guarantee is
// enforced by middleware.ts for everything under /dashboard, but that
// matcher doesn't cover /api/reports/*/csv|pdf or /print/*/report — a
// temp-password session can hit those directly. Routes and pages outside
// /dashboard that read a session must call this instead of `auth()` so the
// same rule holds there too.
export async function requireUsableSession(): Promise<Session | null> {
  const session = await auth()
  if (!session?.user || session.user.mustChangePassword) return null
  return session
}
