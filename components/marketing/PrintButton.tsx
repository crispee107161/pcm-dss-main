'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function PrintButton({ role }: { role: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${role}/pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const disposition = res.headers.get('content-disposition') ?? ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filenameMatch?.[1] ?? `pcm-dss-${role}-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Could not generate the PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" size="lg" className="px-4" onClick={handleClick} disabled={loading}>
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {loading ? 'Generating PDF…' : 'Export PDF'}
    </Button>
  )
}
