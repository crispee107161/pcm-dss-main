import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getUploadCoverage, formatUploadDate } from '@/lib/upload/coverage'

// Shown before anyone starts an upload — answers "has this already been
// uploaded?" and makes gaps between export types visible, rather than
// relying on a notification after the fact (Response_Forecast_Upload_Sidebar.md §2.2).
export default async function UploadCoverageStatus() {
  const rows = await getUploadCoverage()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Export type</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Months loaded</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Last upload</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="px-4 py-3 font-medium text-foreground">{row.label}</TableCell>
            <TableCell className="px-4 py-3 text-muted-foreground">
              {row.monthsLoaded ?? <span className="italic">No data yet</span>}
            </TableCell>
            <TableCell className="px-4 py-3 text-muted-foreground">
              {row.lastUpload ? (
                <>
                  {formatUploadDate(row.lastUpload.date)} by {row.lastUpload.uploaderEmail}
                </>
              ) : (
                <span className="italic">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
