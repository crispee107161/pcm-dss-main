'use client'

import { useState, type ReactNode } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

interface MethodologyNoteProps {
  label?: string
  children: ReactNode
  className?: string
}

// Small reusable disclosure for "where did this number come from" copy.
// Mirrors the collapsible pattern used in BudgetAllocator / WhatIfSimulator /
// CostCuttingScenario, but owns its own open state internally so it can be
// dropped into a Server Component page (those components' open/onOpenChange
// props can't cross the server/client boundary).
export default function MethodologyNote({
  label = 'See the numbers behind this',
  children,
  className = '',
}: MethodologyNoteProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1.5 cursor-pointer select-none focus-visible:outline-none">
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <p className="text-[11px] text-gray-400">{children}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
