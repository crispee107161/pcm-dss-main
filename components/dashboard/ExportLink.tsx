'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { DownloadIcon, type DownloadIconHandle } from '@/components/ui/download-icon'

// DownloadIcon only animates on its own internal hover by default, which is
// scoped to the small icon itself. Attaching a ref disables that internal
// handling (see nav-icons.tsx's AnimatedNavIcon for the same pattern) so the
// whole row's hover/focus can drive the animation instead.
export function ExportLink({ href }: { href: string }) {
  const iconRef = useRef<DownloadIconHandle>(null)

  function play() {
    iconRef.current?.startAnimation()
  }
  function reset() {
    iconRef.current?.stopAnimation()
  }

  return (
    <Link
      href={href}
      onMouseEnter={play}
      onMouseLeave={reset}
      onFocus={play}
      onBlur={reset}
      className="flex items-center gap-2 text-sm font-semibold rounded-lg px-3.5 py-2 bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-primary/80 transition-colors"
    >
      <DownloadIcon ref={iconRef} size={14} />
      Export
    </Link>
  )
}
