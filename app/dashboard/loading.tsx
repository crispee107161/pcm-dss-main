function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
}

// Mirrors KpiCard's shape (label + icon row, big value, pill sub) used across
// the owner/marketing/sales dashboards.
function KpiCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5 flex flex-col gap-3"
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-8 w-full max-w-28" />
        <Skeleton className="h-5 w-16 rounded-full mt-2" />
      </div>
    </div>
  )
}

// Mirrors the ROI Summary / Data Coverage style card: a header row followed
// by a few evenly-spaced label+value stats.
function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl p-6 bg-card card-shadow">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="py-5 md:py-0 md:px-6">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Mirrors the Quick Navigation card: a section header followed by a row of
// pill-shaped links.
function PillRowCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5"
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    </div>
  )
}

// Mirrors the Follower Sparkline card: a label, a big current-value number,
// a pill row, then a thin chart area.
function ChartCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5 flex flex-col gap-3 h-full"
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-28 mt-3" />
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-14 w-full mt-auto" />
    </div>
  )
}

// Mirrors the "SectionLabel + header w/ badge + 3 stat tiles" content cards
// (Top Campaign, Last Upload, Top Category, Post Engagement) that appear in
// a 2-column row.
function ContentCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5"
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <Skeleton className="h-3 w-40 mb-4" />
      <div className="flex items-start justify-between gap-3 mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
      <Skeleton className="h-2.5 w-28 mt-3" />
    </div>
  )
}

// Mirrors the Predictive Model / Current Model summary: a badge + subtitle
// line, a code-block equation, then a 4-column grid of small stat tiles.
function ModelSummaryCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5 space-y-4"
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-3 w-64 hidden sm:block" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200/60">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="hidden sm:block space-y-1.5 text-right">
          <Skeleton className="h-3 w-20 ml-auto" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>

      {/* ROI Summary / Data Coverage */}
      <StatsCardSkeleton />

      {/* Quick Navigation (2/3) + Follower Sparkline (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <PillRowCardSkeleton />
        </div>
        <ChartCardSkeleton />
      </div>

      {/* Top Campaign + Last Upload (1:1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ContentCardSkeleton />
        <ContentCardSkeleton />
      </div>

      {/* Predictive Model Summary */}
      <ModelSummaryCardSkeleton />
    </div>
  )
}
