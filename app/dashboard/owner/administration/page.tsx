import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import UserManagement from '@/components/admin/UserManagement'

export default async function OwnerAdministrationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const currentUserId = parseInt(session.user.id, 10)

  const [users, totalUploads, recentUploads] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: 'asc' },
      select: { id: true, email: true, role: true, created_at: true, is_active: true },
    }),
    prisma.uploadLog.count(),
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: 10,
      include: { user: { select: { email: true, role: true } } },
    }),
  ])

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="User Management" description="Create accounts, manage roles, and monitor upload activity" />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Users</p>
          <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Business Owners</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {users.filter(u => u.role === 'BUSINESS_OWNER').length}
          </p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Marketing Team Members</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {users.filter(u => u.role === 'MARKETING_TEAM').length}
          </p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Marketing Managers</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {users.filter(u => u.role === 'MARKETING_MANAGER').length}
          </p>
        </div>
      </div>

      {/* Interactive user table */}
      <UserManagement users={users} currentUserId={currentUserId} />

      {/* Recent upload activity */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Upload Activity</h2>
          <span className="text-xs text-muted-foreground">{totalUploads} total uploads</span>
        </div>
        {recentUploads.length === 0 ? (
          <p className="text-muted-foreground text-sm p-6">No uploads yet.</p>
        ) : (
          <div className="table-scroll rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">File</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/50 border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(log.uploaded_at)}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{log.user.email}</td>
                    <td className="px-4 py-3 text-foreground max-w-xs truncate text-xs" title={log.filename}>{log.filename}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.upload_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'SUCCESS' ? 'bg-status-positive/10 text-status-positive' : 'bg-status-negative/10 text-status-negative'
                      }`}>
                        {log.status === 'SUCCESS' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
