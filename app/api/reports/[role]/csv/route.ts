import { NextRequest, NextResponse } from 'next/server'
import { requireUsableSession } from '@/lib/auth-guard'
import { rateLimit } from '@/lib/rate-limit'
import { buildReportData } from '@/lib/reports/report-data'
import { buildReportCsv } from '@/lib/reports/csv'
import type { Role } from '@/types/index'

export const runtime = 'nodejs'

const CSV_EXPORT_LIMIT = 10
const CSV_EXPORT_WINDOW_MS = 60_000

// mvp.md §3 S9 access matrix: MARKETING_TEAM is View-only, so PDF/CSV
// export is Owner + Marketing Manager only.
const ROLE_TO_PATH: Record<Exclude<Role, 'MARKETING_TEAM'>, 'owner' | 'marketing'> = {
  BUSINESS_OWNER: 'owner',
  MARKETING_MANAGER: 'marketing',
}

function buildFilename(role: string): string {
  const title = role === 'owner' ? 'Business Performance Report' : 'Marketing Performance Report'
  const dateLabel = new Intl.DateTimeFormat('en-CA').format(new Date())
  return `PC Merchandise - ${title} - ${dateLabel}.csv`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const session = await requireUsableSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role === 'MARKETING_TEAM') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role } = await params
  const expectedPath = ROLE_TO_PATH[session.user.role as Exclude<Role, 'MARKETING_TEAM'>]
  if (role !== expectedPath) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { allowed, retryAfterSeconds } = rateLimit(`csv-export:${session.user.id}`, CSV_EXPORT_LIMIT, CSV_EXPORT_WINDOW_MS)
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many CSV export requests. Try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    )
  }

  try {
    const data = await buildReportData({ role: expectedPath })
    const csv = buildReportCsv(data)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${buildFilename(role)}"`,
      },
    })
  } catch (err) {
    console.error('CSV export: failed to build report:', err)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
}
