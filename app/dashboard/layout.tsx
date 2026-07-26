import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BlurProvider } from '@/contexts/BlurContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <BlurProvider>{children}</BlurProvider>
}
