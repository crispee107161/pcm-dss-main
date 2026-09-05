function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
}

// Mirrors UploadCoverageStatus: a 3-column table, one row per export type.
function CoverageTableSkeleton() {
  const rows = ['w-24', 'w-28', 'w-20', 'w-32', 'w-24', 'w-28', 'w-20']
  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-6 bg-gray-50">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-2.5 w-32" />
      </div>
      {rows.map((w, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-6 border-t border-border">
          <Skeleton className={`h-3.5 ${w}`} />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      ))}
    </div>
  )
}

// Mirrors UploadForm: heading, dashed drop zone, upload button.
function UploadFormSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-5 w-48" />
      <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-3 w-96 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-8 w-36 rounded-lg" />
    </div>
  )
}

// Mirrors UploadHistory: 9-column table, a few recent rows.
function HistoryTableSkeleton() {
  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-4 bg-gray-50">
        {['w-16', 'w-24', 'w-14', 'w-10', 'w-10', 'w-14', 'w-14', 'w-14', 'w-14'].map((w, i) => (
          <Skeleton key={i} className={`h-2.5 ${w}`} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-4 border-t border-border">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function UploadPageSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-border space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-full max-w-lg" />
        </div>
        <CoverageTableSkeleton />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
        <UploadFormSkeleton />
      </div>

      <div className="bg-card rounded-2xl card-shadow p-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <HistoryTableSkeleton />
      </div>
    </div>
  )
}
