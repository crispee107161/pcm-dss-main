'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcryptjs from 'bcryptjs'
import type { Role } from '@/types/index'

const VALID_ROLES: Role[] = ['MARKETING_MANAGER', 'MARKETING_TEAM', 'BUSINESS_OWNER']

// Returns a union rather than throwing: these functions are wired via
// useActionState, which only catches a *returned* {error} — a throw still
// bypasses it and crashes the whole page into app/error.tsx (e.g. a session
// expiring mid-admin-page).
async function requireOwner() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    return { error: 'Unauthorized' as const }
  }
  return { session }
}

export async function updateUserRole(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_

  const userId = parseInt(formData.get('userId') as string, 10)
  const role = formData.get('role') as Role

  if (isNaN(userId) || !VALID_ROLES.includes(role)) {
    return { error: 'Invalid user ID or role.' }
  }

  // Prevent changing your own role
  if (userId === parseInt(session.user.id, 10)) {
    return { error: "You can't change your own role." }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } })
  revalidatePath('/dashboard/owner/administration')
  return { success: 'Role updated.' }
}

export async function createUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }

  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null
  const role = formData.get('role') as Role

  if (!email || !password || !role) {
    return { error: 'All fields are required.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email address.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (!VALID_ROLES.includes(role)) {
    return { error: 'Invalid role.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'A user with that email already exists.' }
  }

  const password_hash = await bcryptjs.hash(password, 10)
  await prisma.user.create({ data: { email, password_hash, role } })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${email} created successfully.` }
}

export async function resetPassword(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }
  const { session } = auth_

  const userId = parseInt(formData.get('userId') as string, 10)
  const password = formData.get('password') as string | null

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  // Prevent resetting your own password here (use normal account settings for that)
  if (userId === parseInt(session.user.id, 10)) {
    return { error: "Use your account settings to change your own password." }
  }

  const password_hash = await bcryptjs.hash(password, 10)
  await prisma.user.update({ where: { id: userId }, data: { password_hash } })
  revalidatePath('/dashboard/owner/administration')
  return { success: 'Password reset successfully.' }
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

  const userId = parseInt(formData.get('userId') as string, 10)

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }
  if (userId === parseInt(session.user.id, 10)) {
    return { error: "You can't deactivate your own account." }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found.' }
  }

  await prisma.user.update({ where: { id: userId }, data: { is_active: false } })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${user.email} deactivated.` }
}

export async function reactivateUser(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth_ = await requireOwner()
  if ('error' in auth_) return { error: auth_.error }

  const userId = parseInt(formData.get('userId') as string, 10)

  if (isNaN(userId)) {
    return { error: 'Invalid user ID.' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found.' }
  }

  await prisma.user.update({ where: { id: userId }, data: { is_active: true } })
  revalidatePath('/dashboard/owner/administration')
  return { success: `User ${user.email} reactivated.` }
}
