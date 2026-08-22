'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { uploadCSV, revalidateDashboards } from '@/actions/upload'
import type { UploadResult } from '@/types/index'

type FileStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'needs-confirmation'

export interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  result: UploadResult | null
}

interface UploadContextValue {
  queue: QueuedFile[]
  isPending: boolean
  addFiles: (files: FileList | null) => void
  removeFile: (id: string) => void
  clearAll: () => void
  runBatchUpload: () => void
  retryFile: (id: string) => void
  confirmFile: (id: string) => void
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [isPending, setIsPending] = useState(false)

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const entries: QueuedFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      status: 'pending',
      result: null,
    }))
    setQueue((prev) => [...prev, ...entries])
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }

  function clearAll() {
    setQueue([])
  }

  function statusFromResult(result: UploadResult): FileStatus {
    if (result.status === 'SUCCESS') return 'success'
    if (result.status === 'NEEDS_CONFIRMATION') return 'needs-confirmation'
    return 'failed'
  }

  async function runBatchUpload() {
    const pending = queue.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setIsPending(true)
    setQueue((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
    )

    await Promise.all(
      pending.map(async (entry) => {
        const formData = new FormData()
        formData.append('file', entry.file)
        const result = await uploadCSV(null, formData)
        setQueue((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: statusFromResult(result), result } : f))
        )
      })
    )

    await revalidateDashboards()
    setIsPending(false)
  }

  async function retryFile(id: string) {
    const entry = queue.find((f) => f.id === id)
    if (!entry) return

    setIsPending(true)
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading' } : f)))

    const formData = new FormData()
    formData.append('file', entry.file)
    const result = await uploadCSV(null, formData)
    setQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: statusFromResult(result), result } : f))
    )

    await revalidateDashboards()
    setIsPending(false)
  }

  // The user reviewed the existing-vs-incoming totals shown for a
  // NEEDS_CONFIRMATION file and chose to proceed — re-submit with the
  // confirmed flag so the server action skips the overlap check this time.
  async function confirmFile(id: string) {
    const entry = queue.find((f) => f.id === id)
    if (!entry) return

    setIsPending(true)
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading' } : f)))

    const formData = new FormData()
    formData.append('file', entry.file)
    formData.append('confirmed', 'true')
    const result = await uploadCSV(null, formData)
    setQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: statusFromResult(result), result } : f))
    )

    await revalidateDashboards()
    setIsPending(false)
  }

  return (
    <UploadContext.Provider value={{ queue, isPending, addFiles, removeFile, clearAll, runBatchUpload, retryFile, confirmFile }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used within UploadProvider')
  return ctx
}
