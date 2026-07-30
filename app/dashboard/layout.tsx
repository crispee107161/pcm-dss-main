import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BlurProvider } from '@/contexts/BlurContext'
import { IdleTimeoutProvider } from '@/contexts/IdleTimeoutContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return (
    <BlurProvider>
      <IdleTimeoutProvider>{children}</IdleTimeoutProvider>
    </BlurProvider>
  )
}
