import { NextRequest, NextResponse } from 'next/server'
import { requireUsableSession } from '@/lib/auth-guard'
import { launchBrowser } from '@/lib/pdf/browser'
import { rateLimit } from '@/lib/rate-limit'
import type { Role } from '@/types/index'

export const runtime = 'nodejs'
export const maxDuration = 60

const PDF_EXPORT_LIMIT = 5
const PDF_EXPORT_WINDOW_MS = 60_000

// MARKETING_TEAM is blocked above before this map is consulted (View-only,
// no export per mvp.md §3 S9); kept here only so the Record type stays total.
const ROLE_TO_PATH: Record<Role, string> = {
  BUSINESS_OWNER: 'owner',
  MARKETING_MANAGER: 'marketing',
  MARKETING_TEAM: 'marketing',
}

function resolveAppOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  // Local dev fallback only — production should always set one of the above
  // so headless Chromium never navigates using an attacker-influenced Host header.
  return new URL(request.url).origin
}

const ROLE_REPORT_TITLE: Record<string, string> = {
  owner: 'Business Performance Report',
  marketing: 'Marketing Performance Report',
}

function buildFilename(role: string): string {
  const title = ROLE_REPORT_TITLE[role] ?? 'Performance Report'
  const dateLabel = new Intl.DateTimeFormat('en-CA').format(new Date()) // YYYY-MM-DD
  return `PC Merchandise - ${title} - ${dateLabel}.pdf`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const session = await requireUsableSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // mvp.md §3 S9 access matrix: MARKETING_TEAM is View-only on Reports, so
  // PDF/CSV export is Owner + Marketing Manager only.
  if (session.user.role === 'MARKETING_TEAM') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role } = await params
  const expectedPath = ROLE_TO_PATH[session.user.role as Role]
  if (role !== expectedPath) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // This launches a full Chromium process per request — by far the most
  // expensive endpoint in the app — so it needs its own, tighter limit
  // rather than relying on a shared bucket.
  const { allowed, retryAfterSeconds } = rateLimit(`pdf-export:${session.user.id}`, PDF_EXPORT_LIMIT, PDF_EXPORT_WINDOW_MS)
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many PDF export requests. Try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    )
  }

  const origin = resolveAppOrigin(request)
  const printUrl = `${origin}/print/${role}/report?pdf=1`
  const cookieHeader = request.headers.get('cookie') ?? ''

  let browser: Awaited<ReturnType<typeof launchBrowser>>
  try {
    browser = await launchBrowser()
  } catch (err) {
    console.error('PDF export: failed to launch browser:', err)
    return NextResponse.json({ error: 'PDF export is temporarily unavailable' }, { status: 503 })
  }

  try {
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ cookie: cookieHeader })
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30_000 })
    await page.emulateMediaType('print')

    // Page size and margins come solely from the `@page` rule in globals.css
    // (preferCSSPageSize) — passing an explicit `margin`/`format` here as well
    // risks Chromium compounding the two (margins effectively doubling).
    const pdfBuffer = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${buildFilename(role)}"`,
      },
    })
  } catch (err) {
    console.error('PDF export: failed to render report:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  } finally {
    await browser.close()
  }
}
