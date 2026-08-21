'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DownloadIcon } from '@/components/ui/download-icon'
import { Spinner } from '@/components/ui/spinner'

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
      {loading ? <Spinner /> : <DownloadIcon size={16} />}
      {loading ? 'Generating PDF…' : 'Export PDF'}
    </Button>
  )
}
