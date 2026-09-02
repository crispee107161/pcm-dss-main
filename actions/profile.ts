'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security-log'
import { rateLimit } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

type PasswordState = { error?: string; success?: string } | null

// Otherwise unthrottled: an authenticated session could otherwise use this
// as a password oracle against its own account via bcrypt.compare below,
// the same primitive loginAction already rate-limits pre-authentication.
const CHANGE_PASSWORD_LIMIT = 10
const CHANGE_PASSWORD_WINDOW_MS = 10 * 60 * 1000

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated' }

  const { allowed, retryAfterSeconds } = rateLimit(
    `change-password:${session.user.id}`,
    CHANGE_PASSWORD_LIMIT,
    CHANGE_PASSWORD_WINDOW_MS
  )
  if (!allowed) {
    return { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` }
  }

  const current = formData.get('current_password') as string
  const next = formData.get('new_password') as string
  const confirm = formData.get('confirm_password') as string

  if (!current || !next || !confirm) return { error: 'All fields are required' }
  if (next !== confirm) return { error: 'New passwords do not match' }
  if (next.length < 12) return { error: 'New password must be at least 12 characters' }

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id, 10) } })
  if (!user) return { error: 'User not found' }

  const valid = await bcrypt.compare(current, user.password_hash)
  if (!valid) {
    await logSecurityEvent({
      eventType: 'AUTHORIZATION_DENIED',
      userId: user.id,
      actorEmail: user.email,
      outcome: 'FAILURE',
      detail: 'password change failed — incorrect current password',
    })
    return { error: 'Current password is incorrect' }
  }

  const hash = await bcrypt.hash(next, 12)
  // SR-A8: any successful password change — forced or voluntary — clears a
  // pending must-change flag and its temp-password expiry.
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: hash, must_change_password: false, temp_password_expires_at: null },
  })
  await logSecurityEvent({
    eventType: 'PASSWORD_CHANGE',
    userId: user.id,
    actorEmail: user.email,
    outcome: 'SUCCESS',
  })

  // SR-A9 — a successful password change issues a fresh session rather than
  // leaving the old JWT (still carrying the pre-change must_change_password
  // claim) in place until it naturally expires. Re-signing in with the new
  // password mints a new signed cookie; middleware.ts's getToken() only ever
  // reads that cookie, it doesn't re-run lib/auth.ts's jwt() callback, so
  // without this a forced password change would otherwise redirect-loop.
  // Side effect: this re-run of authorize() also writes a SIGN_IN_SUCCESS
  // row right after PASSWORD_CHANGE for every change — an artifact of
  // reusing signIn() for re-minting, not a separate sign-in event.
  await signIn('credentials', { email: user.email, password: next, redirect: false })

  return { success: 'Password updated successfully' }
}
