function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
}

// Mirrors FilterTabs: a segmented control with 3 pills (Needs Review, All, Unassigned).
function FilterTabsSkeleton() {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1 mb-4 w-fit">
      <Skeleton className="h-7 w-28 rounded-lg" />
      <Skeleton className="h-7 w-16 rounded-lg" />
      <Skeleton className="h-7 w-24 rounded-lg" />
    </div>
  )
}

// Mirrors one ReviewCard: title, "View post" pill + type badge, flag reason
// line, then the manager action row of category-suggestion chips.
function ReviewCardSkeleton() {
  return (
    <div className="px-4 py-4 border-t border-border first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/3 max-w-xs" />
          <Skeleton className="h-6 w-24 rounded-full mt-1.5" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
      </div>
      <Skeleton className="h-3 w-40 mt-3" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
    </div>
  )
}

export default function ContentPageSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <FilterTabsSkeleton />

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-9 w-44 rounded-xl" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>

        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
