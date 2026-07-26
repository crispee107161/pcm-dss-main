'use client'

import { useEffect } from 'react'

/** Mirrors Sure's print layout: auto-open the browser print dialog shortly after the page loads. */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500)
    return () => clearTimeout(timer)
  }, [])

  return null
}
