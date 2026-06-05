'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { uploadCSV } from '@/actions/upload'
import type { UploadResult } from '@/types/index'

type FileStatus = 'pending' | 'uploading' | 'success' | 'failed'

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

  async function runBatchUpload() {
    const pending = queue.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setIsPending(true)
    for (const entry of pending) {
      setQueue((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' } : f))
      )

      const formData = new FormData()
      formData.append('file', entry.file)
      const result = await uploadCSV(null, formData)

      setQueue((prev) =>
        prev.map((f) =>
          f.id === entry.id
            ? { ...f, status: result.status === 'SUCCESS' ? 'success' : 'failed', result }
            : f
        )
      )
    }
    setIsPending(false)
  }

  return (
    <UploadContext.Provider value={{ queue, isPending, addFiles, removeFile, clearAll, runBatchUpload }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUpload must be used within UploadProvider')
  return ctx
}
