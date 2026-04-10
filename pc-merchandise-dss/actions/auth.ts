'use server'

import { signIn, signOut, auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@/types/index'

const roleRoutes: Record<Role, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  SALES_DIRECTOR: '/dashboard/sales',
  BUSINESS_OWNER: '/dashboard/owner',
}

export async function loginAction(
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
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
  await signOut({ redirect: false })
  redirect('/login')
}
