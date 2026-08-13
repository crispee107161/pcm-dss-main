'use client'

import type { GroupRankingRow } from '@/lib/stats/ad-set-ranking'
import { MIN_ADS_FOR_CONFIDENCE } from '@/lib/stats/ad-set-ranking'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

export default function AdSetRankingTable({ rows, idLabel }: { rows: GroupRankingRow[]; idLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">No messaging ads found. Upload an Ads CSV first.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/50 border-b border-border">
          <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{idLabel}</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ads</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Spend</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Inquiries</TableHead>
          <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">CPI</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.id} className="border-t border-border hover:bg-secondary/50/50 transition-colors">
            <TableCell className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm max-w-xs truncate" title={row.name}>{row.name}</span>
                {row.lowConfidence && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning flex-shrink-0"
                    title={`Fewer than ${MIN_ADS_FOR_CONFIDENCE} ads — CPI here is noisier than the groups above`}
                  >
                    Low confidence
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate" title={row.id}>{row.id}</div>
            </TableCell>
            <TableCell className="px-4 py-3 text-right text-sm text-foreground">{row.adCount}</TableCell>
            <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.spend)}</TableCell>
            <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{row.inquiries.toLocaleString()}</TableCell>
            <TableCell className="sensitive px-4 py-3 text-right font-semibold text-foreground">
              {row.cpi !== null ? formatPHP(row.cpi) : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
