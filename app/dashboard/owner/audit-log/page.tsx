import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadAuditLog } from '@/lib/data/audit-log'
import { PageHeader } from '@/components/nav/PageHeader'
import AuditLogTable from '@/components/audit/AuditLogTable'

export default async function OwnerAuditLogPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { events, totalUploads, totalCategoryActions, totalSecurityEvents } = await loadAuditLog(200)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Audit Log"
        description="Every upload, category assignment, and security event (sign-in, lockout, account changes), with user and timestamp (FR-24, SR-L1/L2)"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Uploads</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalUploads}</p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Category Assignments</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalCategoryActions}</p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Security Events</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalSecurityEvents}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Activity</h2>
          <span className="text-xs text-muted-foreground">Last {events.length} events</span>
        </div>
        <AuditLogTable events={events} />
      </div>
    </div>
  )
}
