'use client'

import { useActionState, useRef } from 'react'
import { uploadCSV } from '@/actions/upload'
import type { UploadResult } from '@/types/index'

export default function UploadForm() {
  const [state, formAction, isPending] = useActionState(uploadCSV, null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload Facebook CSV</h2>

      <form action={formAction} className="space-y-4">
        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-red-500 hover:bg-zinc-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file && fileInputRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              fileInputRef.current.files = dt.files
            }
          }}
        >
          <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-slate-600 font-medium text-sm">
            Drag & drop your CSV file here, or <span className="text-red-700">click to browse</span>
          </p>
          <p className="text-slate-400 text-xs mt-1">Accepted: Facebook Ads CSV or Posts CSV</p>

          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              // Show filename
              const label = e.target.parentElement?.querySelector('.filename-label')
              if (label && e.target.files?.[0]) {
                label.textContent = e.target.files[0].name
              }
            }}
          />
          <p className="filename-label text-red-700 text-xs mt-2 font-medium"></p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white rounded-lg px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2"
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
              Upload CSV
            </>
          )}
        </button>
      </form>

      {/* Result display */}
      {state && !isPending && (
        <div className="mt-4">
          {state.status === 'SUCCESS' ? (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-800 font-medium text-sm">Upload Successful</p>
                  <p className="text-green-700 text-sm mt-1">
                    {state.records_inserted} records inserted, {state.records_updated} records updated
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {state.upload_type === 'ADS_CSV' ? 'Ads CSV' : 'Posts CSV'}
                    </span>
                    {state.retrained && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Model Retrained
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-800 font-medium text-sm">Upload Failed</p>
                  <p className="text-red-700 text-sm mt-1">{state.error_message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
