import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import DashboardOverview from '@/components/dashboard/DashboardOverview'
import { greetingName } from '@/lib/greeting'

export default async function MarketingDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; all?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM') {
    redirect('/login')
  }

  const displayName = greetingName(session.user.name, session.user.email)
  const { from, to, all } = await searchParams

  return (
    <DashboardOverview
      role={session.user.role}
      displayName={displayName}
      from={from}
      to={to}
      all={all}
    />
  )
}
