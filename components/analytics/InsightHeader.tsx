'use client'

import { useState, type ReactNode } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

export type Confidence = 'high' | 'medium' | 'low'
export type InsightDisclosure = 'collapsible' | 'always'
export type InsightTone = 'app' | 'print'

const CONFIDENCE_META: Record<Confidence, { dot: string; label: string }> = {
  high:   { dot: 'bg-green-500',  label: 'Reliable' },
  medium: { dot: 'bg-yellow-400', label: 'Rough guide' },
  low:    { dot: 'bg-red-400',    label: 'Weak signal' },
}

// print reports render on a fixed white page regardless of the viewer's theme,
// so they use Tailwind's untouched neutral-* scale instead of this app's
// theme-dependent gray-* dual ramp (see components/reports/ReportPrimitives.tsx)
const TONE_CLASSES: Record<InsightTone, { label: string; heading: string; detail: string; border: string; trigger: string }> = {
  app:   { label: 'text-gray-600',    heading: 'text-gray-900',    detail: 'text-gray-600',    border: 'border-gray-100',    trigger: 'text-gray-500 hover:text-gray-700' },
  print: { label: 'text-neutral-500', heading: 'text-neutral-900', detail: 'text-neutral-600', border: 'border-neutral-100', trigger: 'text-neutral-400 hover:text-neutral-600' },
}

interface InsightHeaderProps {
  confidence?: Confidence
  headline: string
  detail?: string
  action?: string
  children?: ReactNode
  mathLabel?: string
  disclosure?: InsightDisclosure
  tone?: InsightTone
}

export default function InsightHeader({
  confidence,
  headline,
  detail,
  action,
  children,
  mathLabel = 'See the numbers behind this',
  disclosure = 'collapsible',
  tone = 'app',
}: InsightHeaderProps) {
  const [open, setOpen] = useState(false)
  const t = TONE_CLASSES[tone]

  return (
    <div>
      {confidence && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`inline-block w-2 h-2 rounded-full ${CONFIDENCE_META[confidence].dot}`} />
          <span className={`text-xs font-medium uppercase tracking-wider ${t.label}`}>
            {CONFIDENCE_META[confidence].label}
          </span>
        </div>
      )}

      <h3 className={`text-lg font-semibold leading-snug ${t.heading}`}>{headline}</h3>
      {detail && <p className={`text-sm mt-1.5 ${t.detail}`}>{detail}</p>}
      {action && <p className="text-sm font-medium text-red-500 mt-2.5">&rarr; {action}</p>}

      {children && (
        disclosure === 'always' ? (
          <div className={`mt-4 pt-3 border-t ${t.border}`}>
            {mathLabel && <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${t.label}`}>{mathLabel}</p>}
            {children}
          </div>
        ) : (
          <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
            <CollapsibleTrigger className={`text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none ${t.trigger}`}>
              <svg
                className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {mathLabel}
            </CollapsibleTrigger>
            <CollapsibleContent className={`mt-3 pt-3 border-t ${t.border}`}>
              {children}
            </CollapsibleContent>
          </Collapsible>
        )
      )}
    </div>
  )
}
