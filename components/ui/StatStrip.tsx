export interface StatStripItem {
  label: string
  value: string
  sub?: string
}

// Positional (first/middle/last) padding around each divider — not a
// parity-based rule — so there's exactly one horizontal-padding utility per
// breakpoint per side and no ambiguity about which one wins.
function itemClasses(i: number, count: number): string {
  const isFirst = i === 0
  const isLast = i === count - 1
  const vertical = isFirst ? 'pb-5 md:pb-0' : isLast ? 'pt-5 md:pt-0' : 'py-5 md:py-0'
  const horizontal = isFirst ? 'md:pr-6' : isLast ? 'md:pl-6' : 'md:px-6'
  return `${vertical} ${horizontal}`
}

// Divided stat row for secondary metrics that don't warrant full KPI-card
// weight — a `1px` rule between columns instead of a card per stat.
export default function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[repeat(var(--stat-strip-count),minmax(0,1fr))] divide-y md:divide-y-0 md:divide-x divide-border"
      style={{ '--stat-strip-count': items.length } as React.CSSProperties}
    >
      {items.map((item, i) => (
        <div key={item.label} className={itemClasses(i, items.length)}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.07em] font-semibold mb-1.5">{item.label}</p>
          <p className="sensitive text-lg font-medium tracking-tight tabular text-foreground">{item.value}</p>
          {item.sub && <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}
