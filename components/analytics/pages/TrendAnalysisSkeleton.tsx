function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
}

// Mirrors TrendAnalysisView's actual layout: header, an insight card
// (collapsed by default — InsightHeader's `open` state starts false, so the
// "See the numbers behind this" stat grid isn't part of the initial paint),
// then TrendCharts' full-width Spend/Messaging card followed by a two-column
// Reach + Post Engagement row.
export default function TrendAnalysisSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8 space-y-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <Skeleton className="h-4 w-72 mb-4" />
        <Skeleton className="h-[180px] w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl card-shadow p-6">
          <Skeleton className="h-4 w-56 mb-4" />
          <Skeleton className="h-[180px] w-full" />
        </div>
        <div className="bg-card rounded-2xl card-shadow p-6">
          <Skeleton className="h-4 w-56 mb-4" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      </div>
    </div>
  )
}
