'use client'

import { motion, useReducedMotion } from 'motion/react'

// Shared shared-element sliding-indicator mechanism for any tab-like control
// where the active option's marker should slide smoothly between positions
// rather than snap (motion's layoutId — see the two current consumers,
// components/marketing/ContentClient.tsx's FilterTabs and
// components/marketing/TrendCharts.tsx's ChartViewToggle, for what "snap"
// looked like before). Deliberately styling-agnostic: callers own every
// class (track, segment, indicator) so two segmented controls that may not
// always share one skin (both currently use the brand/bordered skin as of
// 2026-09-04, but each could opt into the neutral skin independently) can
// share this one implementation instead of each hand-rolling the same
// layoutId/useReducedMotion boilerplate and quietly drifting apart.
const SLIDING_TABS_TRANSITION = { type: 'spring', stiffness: 500, damping: 40 } as const
const REDUCED_SLIDING_TABS_TRANSITION = { duration: 0.01 }

export interface SlidingTabsOption<T extends string> {
  value: T
  label: string
}

export interface SlidingTabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SlidingTabsOption<T>[]
  // Must be unique per rendered instance of this control on the page — two
  // instances sharing a layoutId would animate into each other's position.
  layoutId: string
  ariaLabel: string
  className?: string
  segmentClassName: (active: boolean) => string
  indicatorClassName: string
}

export function SlidingTabs<T extends string>({
  value, onChange, options, layoutId, ariaLabel, className, segmentClassName, indicatorClassName,
}: SlidingTabsProps<T>) {
  const reduceMotion = useReducedMotion()
  return (
    <div role="group" aria-label={ariaLabel} className={className}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={segmentClassName(active)}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={indicatorClassName}
                transition={reduceMotion ? REDUCED_SLIDING_TABS_TRANSITION : SLIDING_TABS_TRANSITION}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
