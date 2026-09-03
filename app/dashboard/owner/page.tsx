import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import DashboardOverview from '@/components/dashboard/DashboardOverview'

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; all?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') redirect('/login')

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
