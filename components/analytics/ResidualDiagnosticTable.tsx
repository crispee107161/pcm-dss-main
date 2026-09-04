'use client'

// FR-31 §6, amended docs/raven/FR31_Regression_Specification.md 2026-09-05:
// the table shows only advertisements exceeding the ratio threshold, with
// the full sorted population available behind a toggle. Extracted from
// RegressionSection.tsx (a server component) because the toggle needs
// local state; show-all/collapse pattern follows CampaignHealthTable.tsx.

import { useState } from 'react'
import type { ResidualDiagnostic } from '@/lib/stats/fr31-regression'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
}

export default function ResidualDiagnosticTable({ diagnostic }: { diagnostic: ResidualDiagnostic }) {
  const [showAll, setShowAll] = useState(false)
  const { rows, flagged, threshold } = diagnostic
  const visible = showAll ? rows : flagged
  const hasMore = rows.length > flagged.length

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm p-6">No ads in the primary population.</p>
  }

  return (
    <div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm px-5 py-6">
          No advertisements exceed a ratio of {threshold}.
        </p>
      ) : (
        <Table>
          <TableCaption className="sr-only">
            Ads whose actual cost per inquiry exceeds what the model predicts, ratio above {threshold}× is flagged
          </TableCaption>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-b border-border">
              <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Spend</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Actual CPI</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Predicted CPI</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(row => {
              const isFlagged = row.ratio > threshold
              return (
                <TableRow key={row.ad_id} className="border-t border-border">
                  <TableHead scope="row" className="px-4 py-3 text-sm text-foreground font-normal">{row.ad_name}</TableHead>
                  <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.spend)}</TableCell>
                  <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.actualCpi)}</TableCell>
                  <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.predictedCpi)}</TableCell>
                  <TableCell
                    className={`px-4 py-3 text-right text-sm font-semibold ${isFlagged ? 'text-status-negative' : 'text-foreground'}`}
                  >
                    {row.ratio.toFixed(2)}×
                    {isFlagged && <span className="sr-only"> (above the {threshold}× threshold)</span>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {hasMore && (
        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {showAll ? `All ${rows.length} advertisements` : `Showing ${flagged.length} above the ${threshold}× threshold, of ${rows.length} total`}
          </p>
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showAll ? (
              <> Show less <span>▲</span> </>
            ) : (
              <> Show all {rows.length} advertisements <span>▼</span> </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
