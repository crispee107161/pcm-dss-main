'use client'

import { useRef, useState, useEffect } from 'react'
import { useUpload } from '@/contexts/UploadContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loading01Icon } from '@animateicons/react/huge'
import { DatabaseIcon, CircleCheckIcon, type CircleCheckIconHandle } from 'lucide-animated'

const UPLOAD_TYPE_LABELS: Record<string, string> = {
  ADS_CSV: 'Ads CSV',
  POSTS_CSV: 'Posts CSV',
  PAGE_METRIC_CSV: 'Page Metric',
  FOLLOWER_HISTORY_CSV: 'Follower History',
  PAGE_VIEWERS_CSV: 'Page Viewers',
  DEMOGRAPHICS_CSV: 'Demographics',
}

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const successIconRef = useRef<CircleCheckIconHandle>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { queue, isPending, addFiles, removeFile, clearAll, runBatchUpload } = useUpload()

  function handleClearAll() {
    clearAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const pendingCount  = queue.filter((f) => f.status === 'pending').length
  const successCount  = queue.filter((f) => f.status === 'success').length
  const failedCount   = queue.filter((f) => f.status === 'failed').length
  const totalInserted  = queue.reduce((s, f) => s + (f.result?.records_inserted ?? 0), 0)
  const totalUpdated   = queue.reduce((s, f) => s + (f.result?.records_updated ?? 0), 0)
  const totalUnchanged = queue.reduce((s, f) => s + (f.result?.records_unchanged ?? 0), 0)
  const retrainCount   = queue.filter((f) => f.result?.retrained).length
  const isDone        = queue.length > 0 && pendingCount === 0 && !isPending

  useEffect(() => {
    if (isDone && failedCount === 0 && successCount > 0) {
      successIconRef.current?.startAnimation()
    }
  }, [isDone, failedCount, successCount])

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Upload Facebook CSVs</h2>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-green-500/10'
            : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          addFiles(e.dataTransfer.files)
        }}
      >
        <div className="flex justify-center mb-3">
          <DatabaseIcon size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium text-sm">
          Drag & drop CSV files here, or{' '}
          <span className="text-primary">click to browse</span>
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Select multiple files at once — Ads, Posts, Page Metrics, and more
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Records are matched by date, so re-uploading the same file is safe and never creates duplicates.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {queue.length} file{queue.length !== 1 ? 's' : ''} queued
            </p>
            {!isPending && (
              <Button
                onClick={handleClearAll}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-600 h-auto py-0"
              >
                Clear all
              </Button>
            )}
          </div>

          <ul role="status" aria-live="polite" className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {queue.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3 bg-card">
                {/* Status icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {entry.status === 'pending' && (
                    <span className="h-4 w-4 rounded-full border-2 border-gray-300 inline-block" />
                  )}
                  {entry.status === 'uploading' && (
                    <Loading01Icon size={16} color="var(--muted-foreground)" />
                  )}
                  {entry.status === 'success' && (
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {entry.status === 'failed' && (
                    <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate font-medium">{entry.file.name}</p>
                  {entry.result?.status === 'SUCCESS' && (
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {entry.result.records_inserted === 0 && entry.result.records_updated === 0 ? (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                          Already up to date
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {[
                            entry.result.records_inserted > 0 && `${entry.result.records_inserted} added`,
                            entry.result.records_updated > 0 && `${entry.result.records_updated} changed`,
                            entry.result.records_unchanged > 0 && `${entry.result.records_unchanged} already up to date`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                        {UPLOAD_TYPE_LABELS[entry.result.upload_type] ?? entry.result.upload_type}
                      </Badge>
                      {entry.result.retrained && (
                        <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30 font-medium">
                          Model retrained
                        </Badge>
                      )}
                    </div>
                  )}
                  {entry.result?.status === 'FAILED' && (
                    <p role="alert" className="text-xs text-red-600 mt-0.5">{entry.result.error_message}</p>
                  )}
                </div>

                {/* Remove — only for pending files not currently uploading */}
                {entry.status === 'pending' && !isPending && (
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                    aria-label={`Remove ${entry.file.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          onClick={runBatchUpload}
          disabled={isPending || pendingCount === 0}
          className="bg-primary hover:bg-primary/90 text-white px-4 gap-2 w-full sm:w-auto h-11 sm:h-8 text-base sm:text-sm"
        >
          {isPending ? (
            <>
              <Loading01Icon size={16} color="white" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {pendingCount > 0
                ? `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`
                : 'Upload CSVs'}
            </>
          )}
        </Button>

        {isDone && failedCount === 0 && (
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
            className="text-gray-500 w-full sm:w-auto"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Batch summary */}
      {isDone && (
        <div
          className={`p-4 rounded-xl border ${
            successCount === 0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {successCount === 0 ? (
              <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <CircleCheckIcon ref={successIconRef} size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-sm text-gray-800">
                {successCount} of {queue.length} file{queue.length !== 1 ? 's' : ''} uploaded successfully
                {failedCount > 0 && `, ${failedCount} failed`}
              </p>
              {successCount > 0 && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {totalInserted === 0 && totalUpdated === 0
                    ? 'No changes — your data was already current.'
                    : [
                        totalInserted > 0 && `${totalInserted} records added`,
                        totalUpdated > 0 && `${totalUpdated} updated`,
                        totalUnchanged > 0 && `${totalUnchanged} already up to date`,
                      ].filter(Boolean).join(', ')}
                </p>
              )}
              {retrainCount > 0 && (
                <p className="text-xs text-violet-700 dark:text-violet-400 font-medium mt-1">
                  Regression model retrained {retrainCount} time{retrainCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
