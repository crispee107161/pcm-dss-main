import { requireSession } from '@/lib/auth-guard'
import { BlurProvider } from '@/contexts/BlurContext'
import { IdleTimeoutProvider } from '@/contexts/IdleTimeoutContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <BlurProvider>
      <IdleTimeoutProvider>{children}</IdleTimeoutProvider>
    </BlurProvider>
  )
}
