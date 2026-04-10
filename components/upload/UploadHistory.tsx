import type { UploadLog, UploadType, UploadStatus } from '@/app/generated/prisma/client'

interface UploadHistoryProps {
  logs: (UploadLog & { user: { email: string } })[]
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function StatusBadge({ status }: { status: UploadStatus }) {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Failed
    </span>
  )
}

const TYPE_LABELS: Record<UploadType, { label: string; cls: string }> = {
  ADS_CSV:              { label: 'Ads CSV',           cls: 'bg-purple-100 text-purple-800' },
  POSTS_CSV:            { label: 'Posts CSV',          cls: 'bg-indigo-100 text-indigo-800' },
  PAGE_METRIC_CSV:      { label: 'Page Metric',        cls: 'bg-amber-100  text-amber-800'  },
  FOLLOWER_HISTORY_CSV: { label: 'Follower History',   cls: 'bg-red-100   text-red-800'   },
  PAGE_VIEWERS_CSV:     { label: 'Page Viewers',       cls: 'bg-teal-100   text-teal-800'   },
  DEMOGRAPHICS_CSV:     { label: 'Demographics',       cls: 'bg-pink-100   text-pink-800'   },
}

function TypeBadge({ type }: { type: UploadType }) {
  const { label, cls } = TYPE_LABELS[type] ?? { label: type, cls: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function UploadHistory({ logs }: UploadHistoryProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No uploads yet. Upload a CSV file to get started.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Date</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Filename</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Type</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Inserted</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Updated</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 whitespace-nowrap">
                {formatDate(log.uploaded_at)}
              </td>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 max-w-xs truncate">
                {log.filename}
              </td>
              <td className="px-4 py-3 border-t border-slate-100">
                <TypeBadge type={log.upload_type} />
              </td>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center">
                {log.records_inserted}
              </td>
              <td className="px-4 py-3 text-slate-700 border-t border-slate-100 text-center">
                {log.records_updated}
              </td>
              <td className="px-4 py-3 border-t border-slate-100">
                <StatusBadge status={log.status} />
                {log.error_message && (
                  <p className="text-red-600 text-xs mt-1 max-w-xs truncate" title={log.error_message}>
                    {log.error_message}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
