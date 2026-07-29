'use client'

import { usePathname } from 'next/navigation'
import { useUpload } from '@/contexts/UploadContext'

export default function UploadStatusBar() {
  const { queue, isPending } = useUpload()
  const pathname = usePathname()

  const isOnUploadPage = pathname === '/dashboard/marketing/upload'
  const doneCount = queue.filter((f) => f.status === 'success' || f.status === 'failed').length
  const inFlight  = queue.filter((f) => f.status === 'uploading' || f.status === 'pending').length
  const total     = queue.length

  if (!isPending || isOnUploadPage || total === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-20 z-50 flex items-center gap-3 bg-neutral-900 text-white text-sm px-4 py-3 rounded-xl shadow-2xl shadow-black/30 border border-neutral-700"
    >
      <svg className="animate-spin h-4 w-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>
        Uploading{' '}
        <span className="font-semibold text-red-400">{doneCount}/{total}</span>{' '}
        file{total !== 1 ? 's' : ''}
        {inFlight > 0 && <span className="text-gray-400"> — {inFlight} remaining</span>}
      </span>
    </div>
  )
}
