'use client'

import { usePathname } from 'next/navigation'
import { useUpload } from '@/contexts/UploadContext'
import { Spinner } from '@/components/ui/spinner'

export default function UploadStatusBar() {
  const { queue, isPending } = useUpload()
  const pathname = usePathname()

  const isOnUploadPage = pathname === '/dashboard/marketing/upload' || pathname === '/dashboard/owner/upload'
  const doneCount = queue.filter((f) => f.status === 'success' || f.status === 'failed').length
  const needsConfirmation = queue.filter((f) => f.status === 'needs-confirmation').length
  const inFlight  = queue.filter((f) => f.status === 'uploading' || f.status === 'pending').length
  const total     = queue.length

  if (!isPending || isOnUploadPage || total === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-toast-in fixed bottom-5 right-20 z-50 flex items-center gap-2.5 bg-popover text-popover-foreground text-sm px-4 py-2.5 rounded-full border border-border"
      style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}
    >
      <Spinner className="text-primary flex-shrink-0" />
      <span>
        Uploading{' '}
        <span className="font-semibold text-primary tabular">{doneCount}/{total}</span>{' '}
        file{total !== 1 ? 's' : ''}
        {needsConfirmation > 0 && (
          <span className="text-status-warning"> — {needsConfirmation} need{needsConfirmation !== 1 ? '' : 's'} confirmation</span>
        )}
        {inFlight > 0 && <span className="text-muted-foreground"> — {inFlight} remaining</span>}
      </span>
    </div>
  )
}
