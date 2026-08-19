"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import useMeasure from "react-use-measure"
import { cn } from "@/lib/utils"

interface SmoothDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  align?: "start" | "end"
  className?: string
}

// Panel morphs its own height/opacity via spring physics instead of a CSS
// class toggle, so the reveal (and the Change Password sub-panel inside it)
// feels continuous instead of snapping between states.
export function SmoothDropdown({ open, onOpenChange, trigger, children, align = "end", className }: SmoothDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [contentRef, contentBounds] = useMeasure()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onOpenChange])

  return (
    <div ref={containerRef} className="relative">
      {trigger}
      <motion.div
        initial={false}
        animate={{
          height: open ? contentBounds.height : 0,
          opacity: open ? 1 : 0,
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", damping: 34, stiffness: 380, mass: 0.8 }
        }
        // eslint-disable-next-line react/no-unknown-property -- React 19 native `inert` prop
        inert={!open}
        className={cn(
          "absolute z-40 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card card-shadow-floating",
          align === "end" ? "right-0" : "left-0",
          !open && "pointer-events-none",
          className
        )}
      >
        <div ref={contentRef}>{children}</div>
      </motion.div>
    </div>
  )
}

export default SmoothDropdown
