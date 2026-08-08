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
    return <Badge className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30">Success</Badge>
  }
  return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30">Failed</Badge>
}

const TYPE_LABELS: Record<UploadType, { label: string; cls: string }> = {
  ADS_CSV:              { label: 'Ads CSV',         cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  ADS_DAILY_CSV:        { label: 'Ads Daily CSV',   cls: 'bg-cyan-500/10   text-cyan-700 dark:text-cyan-300   border-cyan-500/30'   },
  POSTS_CSV:            { label: 'Posts CSV',       cls: 'bg-blue-500/10   text-blue-700 dark:text-blue-300   border-blue-500/30'   },
  PAGE_METRIC_CSV:      { label: 'Page Metric',     cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30' },
  FOLLOWER_HISTORY_CSV: { label: 'Follower History',cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  PAGE_VIEWERS_CSV:     { label: 'Page Viewers',    cls: 'bg-green-500/10  text-green-700 dark:text-green-300  border-green-500/30'  },
  DEMOGRAPHICS_CSV:     { label: 'Demographics',    cls: 'bg-red-500/10    text-red-700 dark:text-red-300    border-red-500/30'    },
}

function TypeBadge({ type }: { type: UploadType }) {
  const { label, cls } = TYPE_LABELS[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600 dark:text-gray-400 border-gray-200' }
  return <Badge className={cls}>{label}</Badge>
}

export default function UploadHistory({ logs }: UploadHistoryProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No uploads yet. Upload a CSV file to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">Date</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">Filename</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">Type</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 hidden sm:table-cell">Added</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 hidden sm:table-cell">Changed</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 hidden sm:table-cell">Unchanged</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="px-4 py-3 text-gray-700 whitespace-nowrap">
              {formatDate(log.uploaded_at)}
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-700 max-w-xs truncate">
              {log.filename}
              {log.records_superseded > 0 && (
                <p className="text-xs text-gray-400 truncate">
                  {log.records_superseded} monthly-summary row{log.records_superseded === 1 ? '' : 's'} replaced with daily detail
                </p>
              )}
            </TableCell>
            <TableCell className="px-4 py-3">
              <TypeBadge type={log.upload_type} />
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-700 text-center hidden sm:table-cell">
              {log.records_inserted}
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-700 text-center hidden sm:table-cell">
              {log.records_updated}
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-400 text-center hidden sm:table-cell">
              {log.records_unchanged}
            </TableCell>
            <TableCell className="px-4 py-3">
              <StatusBadge status={log.status} />
              {log.status === 'FAILED' && log.error_message && (
                <p className="text-red-600 text-xs mt-1 max-w-xs truncate" title={log.error_message}>
                  {log.error_message}
                </p>
              )}
              {log.status === 'SUCCESS' && log.warning_message && (
                <p className="text-amber-600 text-xs mt-1 max-w-xs truncate" title={log.warning_message}>
                  {log.warning_message}
                </p>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
