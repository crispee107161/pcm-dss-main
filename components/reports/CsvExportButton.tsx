'use client'

import { useState } from 'react'

export function CsvExportButton({ role }: { role: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${role}/csv`)
      if (!res.ok) throw new Error('Failed to generate CSV')
      const disposition = res.headers.get('content-disposition') ?? ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filenameMatch?.[1] ?? `pcm-dss-${role}-report.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export failed:', err)
      alert('Could not generate the CSV. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="border border-neutral-300 hover:bg-neutral-100 disabled:opacity-60 text-neutral-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-2"
    >
      {loading ? 'Generating CSV…' : 'Export CSV'}
    </button>
  )
}
