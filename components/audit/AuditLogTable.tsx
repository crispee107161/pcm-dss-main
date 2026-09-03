import type { AuditEvent } from '@/lib/data/audit-log'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

const KIND_BADGE: Record<AuditEvent['kind'], string> = {
  UPLOAD: 'bg-secondary text-foreground',
  CATEGORY: 'bg-primary/10 text-primary',
  SECURITY: 'bg-status-warning/10 text-status-warning',
}

const KIND_LABEL: Record<AuditEvent['kind'], string> = {
  UPLOAD: 'Upload',
  CATEGORY: 'Category',
  SECURITY: 'Security',
}

export default function AuditLogTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">No audit events recorded yet.</p>
  }

  return (
    <div className="table-scroll rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary">
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Event</th>
            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Detail</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={`${event.kind}-${event.id}`} className="hover:bg-secondary/50 border-t border-border">
              <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(event.at)}</td>
              {/* Name for reading, email to identify the account unambiguously
                  — same reasoning as docs/raven/Account_Display_Names.md §5. */}
              <td className="px-4 py-3 text-foreground text-xs">
                {event.userName ? (
                  <>
                    {event.userName}
                    <span className="block text-muted-foreground">{event.userEmail}</span>
                  </>
                ) : event.userEmail}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${KIND_BADGE[event.kind]}`}>
                  {KIND_LABEL[event.kind]}
                </span>
              </td>
              <td className="px-4 py-3 text-foreground text-xs max-w-xs truncate" title={event.summary}>{event.summary}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate" title={event.detail}>{event.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
