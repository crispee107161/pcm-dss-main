"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Base UI slider styled with visible tick marks and a large, unmistakably
 * grabbable thumb — built for cases where the control needs to read as
 * interactive at a glance, not as a decorative rule.
 */
export function Slider({
  className,
  min = 0,
  max = 100,
  stops,
  formatValue,
  'aria-label': ariaLabel,
  value,
  defaultValue,
  onValueChange,
  ...props
}: SliderPrimitive.Root.Props<number> & {
  /** Values to render as tick marks along the track (e.g. every step). */
  stops?: number[]
  /** When set, renders the current value in a pill above the thumb while hovering, dragging, or focused. */
  formatValue?: (value: number) => React.ReactNode
}) {
  // Tracks the live value locally even in uncontrolled usage (no `value`
  // prop) — Base UI's Root only reports the current value via
  // onValueChange, so without this the tick marks and formatValue pill
  // would stay frozen at the initial value for the entire drag.
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? min)
  const current = value ?? uncontrolledValue

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      min={min}
      max={max}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(newValue, eventDetails) => {
        setUncontrolledValue(newValue)
        onValueChange?.(newValue, eventDetails)
      }}
      className={cn("relative flex w-full touch-none items-center select-none data-disabled:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full items-center py-2.5">
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          {stops?.map(s => {
            const f = (s - min) / (max - min || 1)
            const active = s <= current + 1e-6
            return (
              <span
                key={s}
                className={cn(
                  "pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  active ? "bg-primary-foreground/70" : "bg-muted-foreground/60",
                )}
                style={{ left: `${f * 100}%` }}
              />
            )
          })}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
          className="group relative block size-6 shrink-0 cursor-grab rounded-full border-[3px] border-primary bg-background shadow-md ring-ring/30 outline-none transition-[box-shadow] duration-150 ease-out hover:ring-4 focus-visible:ring-4 active:cursor-grabbing data-disabled:pointer-events-none"
        >
          {formatValue && (
            <span
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 scale-95 rounded-md bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background opacity-0 shadow-md transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 group-data-[dragging]:scale-100 group-data-[dragging]:opacity-100"
            >
              {formatValue(current)}
            </span>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
