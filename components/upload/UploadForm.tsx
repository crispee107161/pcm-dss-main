'use client'

import { useRef, useState, useEffect } from 'react'
import { useUpload, type QueuedFile } from '@/contexts/UploadContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Spinner } from '@/components/ui/spinner'
import { Loading01Icon } from '@animateicons/react/huge'
import { DatabaseIcon, CircleCheckIcon, type CircleCheckIconHandle } from 'lucide-animated'
import { ClockIcon, CheckIcon, FileWarningIcon, RefreshCwIcon, XIcon } from 'lucide-react'

const ATTACHMENT_STATE: Record<QueuedFile['status'], 'idle' | 'uploading' | 'processing' | 'done' | 'error'> = {
  pending: 'idle',
  uploading: 'uploading',
  success: 'done',
  failed: 'error',
  'needs-confirmation': 'processing',
}

function formatPHP(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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
  const { queue, isPending, addFiles, removeFile, clearAll, runBatchUpload, retryFile, confirmFile } = useUpload()

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
  const isDone        = queue.length > 0 && pendingCount === 0 && !isPending

  useEffect(() => {
    if (isDone && failedCount === 0 && successCount > 0) {
      successIconRef.current?.startAnimation()
    }
  }, [isDone, failedCount, successCount])

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Upload Facebook CSVs</h2>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-status-positive/10'
            : 'border-border hover:border-status-positive/60 hover:bg-accent'
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
          <DatabaseIcon size={40} className="text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium text-sm">
          Drag & drop CSV files here, or{' '}
          <span className="text-primary">click to browse</span>
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Select multiple files at once — Ads, Posts, Page Metrics, Follower History, Page Viewers, and Demographics
        </p>
        <p className="text-muted-foreground text-xs mt-1">
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
            <p className="text-sm font-medium text-foreground">
              {queue.length} file{queue.length !== 1 ? 's' : ''} queued
            </p>
            {!isPending && (
              <Button
                onClick={handleClearAll}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-auto py-0"
              >
                Clear all
              </Button>
            )}
          </div>

          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            {queue.map((entry) => (
              <Attachment key={entry.id} state={ATTACHMENT_STATE[entry.status]} className="w-full">
                <AttachmentMedia>
                  {entry.status === 'pending' && <ClockIcon />}
                  {entry.status === 'uploading' && <Spinner />}
                  {entry.status === 'success' && <CheckIcon />}
                  {entry.status === 'failed' && <FileWarningIcon />}
                  {entry.status === 'needs-confirmation' && <FileWarningIcon />}
                </AttachmentMedia>

                <AttachmentContent>
                  <AttachmentTitle>{entry.file.name}</AttachmentTitle>
                  {entry.status === 'pending' && (
                    <AttachmentDescription>Ready to upload</AttachmentDescription>
                  )}
                  {entry.status === 'uploading' && (
                    <AttachmentDescription>Uploading…</AttachmentDescription>
                  )}
                  {entry.result?.status === 'NEEDS_CONFIRMATION' && entry.result.existing && entry.result.incoming && (
                    <div className="mt-1.5 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-foreground">
                      <p className="font-medium">This period is already loaded — {entry.result.periodLabel}</p>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                        <span>Currently held:</span>
                        <span className="tabular">
                          {entry.result.existing.count.toLocaleString()} {entry.result.existing.count === 1 ? 'record' : 'records'}
                          {entry.result.existing.totalSpend !== undefined && `, ${formatPHP(entry.result.existing.totalSpend)} total spend`}
                        </span>
                        <span>This file contains:</span>
                        <span className="tabular">
                          {entry.result.incoming.count.toLocaleString()} {entry.result.incoming.count === 1 ? 'record' : 'records'}
                          {entry.result.incoming.totalSpend !== undefined && `, ${formatPHP(entry.result.incoming.totalSpend)} total spend`}
                        </span>
                      </div>
                      <p className="mt-1.5 text-muted-foreground">Continuing will update matching records and add new ones. Existing records not present in this file are kept as-is.</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending}
                          onClick={() => confirmFile(entry.id)}
                          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white"
                        >
                          Continue
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => removeFile(entry.id)}
                          className="h-7 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {entry.result?.status === 'SUCCESS' && (
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {entry.result.records_inserted === 0 && entry.result.records_updated === 0 ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
                          Already up to date
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {[
                            entry.result.records_inserted > 0 && `${entry.result.records_inserted} added`,
                            entry.result.records_updated > 0 && `${entry.result.records_updated} changed`,
                            entry.result.records_unchanged > 0 && `${entry.result.records_unchanged} already up to date`,
                          ].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
                        {UPLOAD_TYPE_LABELS[entry.result.upload_type] ?? entry.result.upload_type}
                      </Badge>
                    </div>
                  )}
                  {entry.result?.status === 'FAILED' && (
                    <AttachmentDescription role="alert">{entry.result.error_message}</AttachmentDescription>
                  )}
                </AttachmentContent>

                {entry.status === 'pending' && !isPending && (
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${entry.file.name}`}
                      onClick={() => removeFile(entry.id)}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                )}

                {entry.status === 'failed' && (
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Retry uploading ${entry.file.name}`}
                      onClick={() => retryFile(entry.id)}
                      disabled={isPending}
                    >
                      <RefreshCwIcon />
                    </AttachmentAction>
                    <AttachmentAction
                      aria-label={`Remove ${entry.file.name}`}
                      onClick={() => removeFile(entry.id)}
                      disabled={isPending}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                )}
              </Attachment>
            ))}
          </div>
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
            className="text-muted-foreground w-full sm:w-auto"
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
              ? 'bg-status-negative/10 border-status-negative/30'
              : 'bg-status-positive/10 border-status-positive/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {successCount === 0 ? (
              <svg className="h-5 w-5 text-status-negative flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <CircleCheckIcon ref={successIconRef} size={20} className="text-status-positive flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-sm text-foreground">
                {successCount} of {queue.length} file{queue.length !== 1 ? 's' : ''} uploaded successfully
                {failedCount > 0 && `, ${failedCount} failed`}
              </p>
              {successCount > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {totalInserted === 0 && totalUpdated === 0
                    ? 'No changes — your data was already current.'
                    : [
                        totalInserted > 0 && `${totalInserted} records added`,
                        totalUpdated > 0 && `${totalUpdated} updated`,
                        totalUnchanged > 0 && `${totalUnchanged} already up to date`,
                      ].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
