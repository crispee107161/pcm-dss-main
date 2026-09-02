'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security-log'
import { revalidatePath } from 'next/cache'
import bcryptjs from 'bcryptjs'
import type { Role } from '@/types/index'

const VALID_ROLES: Role[] = ['MARKETING_MANAGER', 'MARKETING_TEAM', 'BUSINESS_OWNER']

// SR-A8 — an admin-issued temporary password stops working 24h after
// issuance even if never changed (see lib/auth.ts's authorize()).
const TEMP_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000

// Returns a union rather than throwing: these functions are wired via
// useActionState, which only catches a *returned* {error} — a throw still
// bypasses it and crashes the whole page into app/error.tsx (e.g. a session
// expiring mid-admin-page).
async function requireOwner() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    if (session?.user) {
      await logSecurityEvent({
        eventType: 'AUTHORIZATION_DENIED',
        userId: parseInt(session.user.id, 10),
        actorEmail: session.user.email,
        outcome: 'FAILURE',
        detail: `attempted an Owner-only admin action as ${session.user.role}`,
      })
    }
    return { error: 'Unauthorized' as const }
  }
  return { session }
}

// Raven's Owner_Deadlock memo (2026-09-02) — NFR-12 requires at least one
// account holding release authority remaining able to act "at all times,"
// a property of the system, not of who happens to exist in it today. Two
// Owner accounts satisfy that by accident; this makes it structurally true
// by requiring at least one other BUSINESS_OWNER, besides the acting user,
// who is both active and unlocked — is_active alone isn't enough, since a
// locked-out Owner can't sign in to unlock anyone (lib/auth.ts rejects
// is_locked at authorize() and the JWT callback kills the session for it).
async function wouldLeaveFewerThanTwoCapableOwners(actorId: number): Promise<boolean> {
  const otherCapableOwners = await prisma.user.count({
    where: { role: 'BUSINESS_OWNER', is_active: true, is_locked: false, id: { not: actorId } },
  })
  return otherCapableOwners < 1
}

// SR-A9 — re-authentication is required before account management actions,
// role changes, and (per the same requirement) dataset deletion. All of
// this file's mutating actions except createUser (provisioning a brand-new
// account, not modifying an existing one) call this before making any
// change. Returns an error string, or null if the acting Owner's own
// current password was confirmed.
async function verifyReauth(actorId: number, actorEmail: string, formData: FormData): Promise<string | null> {
  const confirmPassword = formData.get('reauth_password') as string | null
  if (!confirmPassword) {
    return 'Re-enter your password to confirm this action.'
  }
  const actor = await prisma.user.findUnique({ where: { id: actorId } })
  if (!actor) {
    return 'Session error — please sign in again.'
  }
  const valid = await bcryptjs.compare(confirmPassword, actor.password_hash)
  if (!valid) {
    await logSecurityEvent({
      eventType: 'AUTHORIZATION_DENIED',
      userId: actorId,
      actorEmail,
      outcome: 'FAILURE',
      detail: 'SR-A9 re-authentication failed — incorrect password',
    })
    return 'Incorrect password.'
  }
  return null
}

export async function updateUserRole(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_
  const actorId = parseInt(session.user.id, 10)

  const userId = parseInt(formData.get('userId') as string, 10)
  const role = formData.get('role') as Role

  if (isNaN(userId) || !VALID_ROLES.includes(role)) {
    return { error: 'Invalid user ID or role.' }
  }

  // Prevent changing your own role
  if (userId === actorId) {
    return { error: "You can't change your own role." }
  }

  const targetBefore = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetBefore) {
    return { error: 'User not found.' }
  }

  const reauthError = await verifyReauth(actorId, session.user.email, formData)
  if (reauthError) return { error: reauthError }

  if (
    targetBefore.role === 'BUSINESS_OWNER' &&
    role !== 'BUSINESS_OWNER' &&
    (await wouldLeaveFewerThanTwoCapableOwners(actorId))
  ) {
    await logSecurityEvent({
      eventType: 'AUTHORIZATION_DENIED',
      userId: actorId,
      actorEmail: session.user.email,
      targetUserId: userId,
      outcome: 'FAILURE',
      detail: 'refused role change — would leave fewer than two active, unlocked owner accounts',
    })
    return { error: 'At least two active Owner accounts are required, so one can always unlock or restore the other.' }
  }

  const target = await prisma.user.update({ where: { id: userId }, data: { role } })
  await logSecurityEvent({
    eventType: 'ROLE_CHANGED',
    userId: actorId,
    actorEmail: session.user.email,
    targetUserId: userId,
    outcome: 'SUCCESS',
    detail: `${target.email} → ${role}`,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: 'Role updated.' }
}

export async function createUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_

  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null
  const role = formData.get('role') as Role

  if (!email || !password || !role) {
    return { error: 'All fields are required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email address.' }
  }
  if (password.length < 12) {
    return { error: 'Password must be at least 12 characters.' }
  }
  if (!VALID_ROLES.includes(role)) {
    return { error: 'Invalid role.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'A user with that email already exists.' }
  }

  const password_hash = await bcryptjs.hash(password, 12)
  const created = await prisma.user.create({ data: { email, password_hash, role } })
  await logSecurityEvent({
    eventType: 'ACCOUNT_CREATED',
    userId: parseInt(session.user.id, 10),
    actorEmail: session.user.email,
    targetUserId: created.id,
    outcome: 'SUCCESS',
    detail: `${email} as ${role}`,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${email} created successfully.` }
}

// SR-A8 — issues an admin-set temporary password rather than a permanent
// one: the target must change it within 24h (must_change_password +
// temp_password_expires_at), enforced by lib/auth.ts's authorize() and
// middleware.ts's forced-redirect. Also clears any lockout, since issuing a
// fresh credential is this app's "release" mechanism for SR-A6.
export async function resetPassword(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_
  const actorId = parseInt(session.user.id, 10)

  const userId = parseInt(formData.get('userId') as string, 10)
  const password = formData.get('password') as string | null

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }
  if (!password || password.length < 12) {
    return { error: 'Password must be at least 12 characters.' }
  }

  // Prevent resetting your own password here (use normal account settings for that)
  if (userId === actorId) {
    return { error: "Use your account settings to change your own password." }
  }

  const reauthError = await verifyReauth(actorId, session.user.email, formData)
  if (reauthError) return { error: reauthError }

  const password_hash = await bcryptjs.hash(password, 12)
  const target = await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash,
      must_change_password: true,
      temp_password_expires_at: new Date(Date.now() + TEMP_PASSWORD_TTL_MS),
      is_locked: false,
      locked_at: null,
      failed_login_attempts: 0,
      last_failed_login_at: null,
    },
  })
  await logSecurityEvent({
    eventType: 'PASSWORD_RESET',
    userId: actorId,
    actorEmail: session.user.email,
    targetUserId: userId,
    outcome: 'SUCCESS',
    detail: target.email,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: 'Temporary password set — the user must change it within 24 hours.' }
}

// SR-A6 — releases a lockout without changing the account's password.
export async function unlockUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_
  const actorId = parseInt(session.user.id, 10)

  const userId = parseInt(formData.get('userId') as string, 10)
  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }

  const reauthError = await verifyReauth(actorId, session.user.email, formData)
  if (reauthError) return { error: reauthError }

  const target = await prisma.user.update({
    where: { id: userId },
    data: { is_locked: false, locked_at: null, failed_login_attempts: 0, last_failed_login_at: null },
  })
  await logSecurityEvent({
    eventType: 'ACCOUNT_UNLOCKED',
    userId: actorId,
    actorEmail: session.user.email,
    targetUserId: userId,
    outcome: 'SUCCESS',
    detail: target.email,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: `${target.email} unlocked.` }
}

// FR-02 says "deactivate," not "delete." A hard delete also breaks
// UploadLog.user_id's RESTRICT foreign key for any user with upload
// history (confirmed live 2026-08-25 — such a delete already throws).
// Deactivation preserves the user row (and every record attributed to
// them, per FR-20's audit trail) and just blocks authentication — see
// lib/auth.ts's is_active check.
export async function deactivateUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_
  const actorId = parseInt(session.user.id, 10)

  const userId = parseInt(formData.get('userId') as string, 10)

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }
  if (userId === actorId) {
    return { error: "You can't deactivate your own account." }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found.' }
  }

  const reauthError = await verifyReauth(actorId, session.user.email, formData)
  if (reauthError) return { error: reauthError }

  if (user.role === 'BUSINESS_OWNER' && (await wouldLeaveFewerThanTwoCapableOwners(actorId))) {
    await logSecurityEvent({
      eventType: 'AUTHORIZATION_DENIED',
      userId: actorId,
      actorEmail: session.user.email,
      targetUserId: userId,
      outcome: 'FAILURE',
      detail: 'refused deactivation — would leave fewer than two active, unlocked owner accounts',
    })
    return { error: 'At least two active Owner accounts are required, so one can always unlock or restore the other.' }
  }

  await prisma.user.update({ where: { id: userId }, data: { is_active: false } })
  await logSecurityEvent({
    eventType: 'ACCOUNT_DEACTIVATED',
    userId: actorId,
    actorEmail: session.user.email,
    targetUserId: userId,
    outcome: 'SUCCESS',
    detail: user.email,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${user.email} deactivated.` }
}

export async function reactivateUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_
  const actorId = parseInt(session.user.id, 10)

  const userId = parseInt(formData.get('userId') as string, 10)

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found.' }
  }

  const reauthError = await verifyReauth(actorId, session.user.email, formData)
  if (reauthError) return { error: reauthError }

  await prisma.user.update({ where: { id: userId }, data: { is_active: true } })
  await logSecurityEvent({
    eventType: 'ACCOUNT_REACTIVATED',
    userId: actorId,
    actorEmail: session.user.email,
    targetUserId: userId,
    outcome: 'SUCCESS',
    detail: user.email,
  })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${user.email} reactivated.` }
}
