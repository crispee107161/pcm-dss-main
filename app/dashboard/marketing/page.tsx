import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import DashboardOverview from '@/components/dashboard/DashboardOverview'

export default async function MarketingDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; all?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM') {
    redirect('/login')
  }

  const displayName = session.user.email?.split('@')[0] ?? 'there'
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
