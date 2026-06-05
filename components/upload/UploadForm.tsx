'use client'

import { useRef, useState } from 'react'
import { useUpload } from '@/contexts/UploadContext'

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
  const [isDragging, setIsDragging] = useState(false)
  const { queue, isPending, addFiles, removeFile, clearAll, runBatchUpload } = useUpload()

  function handleClearAll() {
    clearAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const pendingCount  = queue.filter((f) => f.status === 'pending').length
  const successCount  = queue.filter((f) => f.status === 'success').length
  const failedCount   = queue.filter((f) => f.status === 'failed').length
  const totalInserted = queue.reduce((s, f) => s + (f.result?.records_inserted ?? 0), 0)
  const totalUpdated  = queue.reduce((s, f) => s + (f.result?.records_updated ?? 0), 0)
  const retrainCount  = queue.filter((f) => f.result?.retrained).length
  const isDone        = queue.length > 0 && pendingCount === 0 && !isPending

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Upload Facebook CSVs</h2>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-red-500 bg-red-50'
            : 'border-slate-300 hover:border-red-400 hover:bg-zinc-50'
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
        <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-slate-600 font-medium text-sm">
          Drag & drop CSV files here, or{' '}
          <span className="text-red-700">click to browse</span>
        </p>
        <p className="text-slate-400 text-xs mt-1">
          Select multiple files at once — Ads, Posts, Page Metrics, and more
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
            <p className="text-sm font-medium text-slate-700">
              {queue.length} file{queue.length !== 1 ? 's' : ''} queued
            </p>
            {!isPending && (
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {queue.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3 bg-white">
                {/* Status icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {entry.status === 'pending' && (
                    <span className="h-4 w-4 rounded-full border-2 border-slate-300 inline-block" />
                  )}
                  {entry.status === 'uploading' && (
                    <svg className="animate-spin h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
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
                  <p className="text-sm text-slate-700 truncate font-medium">{entry.file.name}</p>
                  {entry.result?.status === 'SUCCESS' && (
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      <span className="text-xs text-slate-500">
                        +{entry.result.records_inserted} inserted, ~{entry.result.records_updated} updated
                      </span>
                      <span className="inline-flex items-center px-1.5 rounded text-xs bg-slate-100 text-slate-600">
                        {UPLOAD_TYPE_LABELS[entry.result.upload_type] ?? entry.result.upload_type}
                      </span>
                      {entry.result.retrained && (
                        <span className="inline-flex items-center px-1.5 rounded text-xs bg-red-100 text-red-700 font-medium">
                          Model retrained
                        </span>
                      )}
                    </div>
                  )}
                  {entry.result?.status === 'FAILED' && (
                    <p className="text-xs text-red-600 mt-0.5">{entry.result.error_message}</p>
                  )}
                </div>

                {/* Remove — only for pending files not currently uploading */}
                {entry.status === 'pending' && !isPending && (
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
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
      <div className="flex items-center gap-3">
        <button
          onClick={runBatchUpload}
          disabled={isPending || pendingCount === 0}
          className="bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white rounded-lg px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
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
        </button>

        {isDone && failedCount === 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Batch summary */}
      {isDone && (
        <div
          className={`p-4 rounded-xl border ${
            successCount === 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {successCount === 0 ? (
              <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <p className="font-medium text-sm text-slate-800">
                {successCount} of {queue.length} file{queue.length !== 1 ? 's' : ''} uploaded successfully
                {failedCount > 0 && `, ${failedCount} failed`}
              </p>
              {successCount > 0 && (
                <p className="text-sm text-slate-600 mt-0.5">
                  {totalInserted} records inserted, {totalUpdated} records updated
                </p>
              )}
              {retrainCount > 0 && (
                <p className="text-xs text-red-700 font-medium mt-1">
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
