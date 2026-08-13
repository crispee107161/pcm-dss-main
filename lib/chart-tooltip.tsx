import type { ReactNode } from 'react'

/**
 * One row inside a shadcn `ChartTooltipContent` — reproduces that
 * component's own default row markup (indicator dot, muted label, tabular
 * value) exactly, so passing a custom `formatter` (needed for this app's
 * ₱/percent/comma value formatting, which shadcn's default `.toLocaleString()`
 * can't express) doesn't lose the visual consistency the default row gives
 * every other tooltip.
 */
export function ChartTooltipRow({ color, label, value }: { color: string; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-stretch gap-2">
      <div className="h-2.5 w-2.5 shrink-0 self-center rounded-[2px]" style={{ backgroundColor: color }} />
      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
      </div>
    </div>
  )
}
