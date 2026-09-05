function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
}

function SectionLabelSkeleton({ width = 'w-40' }: { width?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className={`h-3 ${width}`} />
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

// Mirrors KpiCard: label + icon row, big value, sub line, delta badge.
function KpiCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col gap-3" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32 mt-2" />
        <div className="flex items-center mt-2.5 pt-2.5 border-t border-gray-100">
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Mirrors a chart card: section label, an optional caption line, then a
// chart-shaped block filling the remaining space.
function ChartCardSkeleton({ captionLines = 1, height = 'h-64' }: { captionLines?: number; height?: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
      <SectionLabelSkeleton />
      {Array.from({ length: captionLines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full max-w-md mb-1.5" />
      ))}
      <Skeleton className={`${height} w-full mt-3`} />
    </div>
  )
}

// Mirrors an AdTable: section label + subtitle, then a header row and a
// handful of data rows (rank badge, ad name + subline, three numeric cells).
function AdTableSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
      <div className="p-5 pb-4">
        <SectionLabelSkeleton width="w-36" />
        <Skeleton className="h-3 w-56 -mt-3" />
      </div>
      <div className="border-t border-gray-100 px-5 py-2 flex items-center gap-3">
        <Skeleton className="h-2.5 w-4" />
        <Skeleton className="h-2.5 w-8 ml-2" />
        <div className="flex-1" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-14 ml-4" />
        <Skeleton className="h-2.5 w-20 ml-4" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-t border-gray-100 px-5 py-3 flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-md flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-24 mt-1.5" />
          </div>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14 ml-4" />
          <Skeleton className="h-3 w-16 ml-4" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="p-5 md:p-7 md:px-8 md:pb-12 max-w-[1440px] mx-auto space-y-[22px]">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-gray-200/60">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[18px]">
        {Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>

      {/* Spend, Inquiries & Reach trend */}
      <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <SectionLabelSkeleton width="w-64" />
        <Skeleton className="h-64 w-full mt-3" />
      </div>

      {/* CPI distribution + Organic Reach & Views trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-stretch">
        <ChartCardSkeleton captionLines={2} />
        <ChartCardSkeleton captionLines={1} />
      </div>

      {/* Content category performance + Page funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-stretch">
        <ChartCardSkeleton captionLines={1} />
        <ChartCardSkeleton captionLines={1} />
      </div>

      {/* Top / bottom ads by CPI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
        <AdTableSkeleton />
        <AdTableSkeleton />
      </div>

      {/* Recent uploads */}
      <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <SectionLabelSkeleton width="w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

    </div>
  )
}
