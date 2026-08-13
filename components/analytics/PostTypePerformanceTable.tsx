'use client'

import type { PostTypeRow } from '@/lib/stats/post-type-performance'
import { MIN_N_FOR_CONFIDENCE } from '@/lib/stats/post-type-performance'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function PostTypePerformanceTable({ rows }: { rows: PostTypeRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">No organic posts found. Upload a Posts CSV first.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/50 border-b border-border">
          <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Post Type</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">n</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Reach</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Engagement Rate</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Views</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.postType} className="border-t border-border hover:bg-secondary/50/50 transition-colors">
            <TableCell className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">{row.postType}</span>
                {row.n < MIN_N_FOR_CONFIDENCE && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning flex-shrink-0"
                    title={`Fewer than ${MIN_N_FOR_CONFIDENCE} posts — the median here is not a stable estimate`}
                  >
                    Low confidence
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="px-4 py-3 text-right text-sm text-foreground">{row.n}</TableCell>
            <TableCell className="px-4 py-3 text-right text-sm text-foreground">{row.medianReach.toLocaleString()}</TableCell>
            <TableCell className="px-4 py-3 text-right font-semibold text-foreground">{row.medianEngagementRate.toFixed(2)}%</TableCell>
            <TableCell className="px-4 py-3 text-right text-sm text-foreground">{row.medianViews !== null ? row.medianViews.toLocaleString() : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
