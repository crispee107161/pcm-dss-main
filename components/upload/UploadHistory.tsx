import type { UploadLog, UploadType, UploadStatus } from '@/app/generated/prisma/client'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
    return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>
  }
  return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>
}

const TYPE_LABELS: Record<UploadType, { label: string; cls: string }> = {
  ADS_CSV:              { label: 'Ads CSV',         cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  POSTS_CSV:            { label: 'Posts CSV',        cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  PAGE_METRIC_CSV:      { label: 'Page Metric',      cls: 'bg-amber-100  text-amber-800  border-amber-200'  },
  FOLLOWER_HISTORY_CSV: { label: 'Follower History', cls: 'bg-red-100    text-red-800    border-red-200'    },
  PAGE_VIEWERS_CSV:     { label: 'Page Viewers',     cls: 'bg-teal-100   text-teal-800   border-teal-200'   },
  DEMOGRAPHICS_CSV:     { label: 'Demographics',     cls: 'bg-pink-100   text-pink-800   border-pink-200'   },
}

function TypeBadge({ type }: { type: UploadType }) {
  const { label, cls } = TYPE_LABELS[type] ?? { label: type, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
  return <Badge className={cls}>{label}</Badge>
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Date</TableHead>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Filename</TableHead>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Type</TableHead>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50 hidden sm:table-cell">Inserted</TableHead>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50 hidden sm:table-cell">Updated</TableHead>
          <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="px-4 py-3 text-slate-700 whitespace-nowrap">
              {formatDate(log.uploaded_at)}
            </TableCell>
            <TableCell className="px-4 py-3 text-slate-700 max-w-xs truncate">
              {log.filename}
            </TableCell>
            <TableCell className="px-4 py-3">
              <TypeBadge type={log.upload_type} />
            </TableCell>
            <TableCell className="px-4 py-3 text-slate-700 text-center hidden sm:table-cell">
              {log.records_inserted}
            </TableCell>
            <TableCell className="px-4 py-3 text-slate-700 text-center hidden sm:table-cell">
              {log.records_updated}
            </TableCell>
            <TableCell className="px-4 py-3">
              <StatusBadge status={log.status} />
              {log.error_message && (
                <p className="text-red-600 text-xs mt-1 max-w-xs truncate" title={log.error_message}>
                  {log.error_message}
                </p>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
