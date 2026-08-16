'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    <Button type="button" variant="secondary" size="lg" className="px-4" onClick={handleClick} disabled={loading}>
      {loading ? 'Generating CSV…' : 'Export CSV'}
    </Button>
  )
}
