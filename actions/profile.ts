'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

type PasswordState = { error?: string; success?: string } | null

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const session = await auth()
  if (!session?.user) return { error: 'Not authenticated' }

  const current = formData.get('current_password') as string
  const next = formData.get('new_password') as string
  const confirm = formData.get('confirm_password') as string

  if (!current || !next || !confirm) return { error: 'All fields are required' }
  if (next !== confirm) return { error: 'New passwords do not match' }
  if (next.length < 8) return { error: 'New password must be at least 8 characters' }

  const user = await prisma.user.findUnique({ where: { id: parseInt(session.user.id, 10) } })
  if (!user) return { error: 'User not found' }

  const valid = await bcrypt.compare(current, user.password_hash)
  if (!valid) return { error: 'Current password is incorrect' }

  const hash = await bcrypt.hash(next, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password_hash: hash } })

  return { success: 'Password updated successfully' }
}
