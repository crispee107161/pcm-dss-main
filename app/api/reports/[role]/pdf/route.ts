import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { launchBrowser } from '@/lib/pdf/browser'
import type { Role } from '@/types/index'

const ROLE_TO_PATH: Record<Role, string> = {
  BUSINESS_OWNER: 'owner',
  MARKETING_MANAGER: 'marketing',
  SALES_DIRECTOR: 'sales',
}

const ROLE_REPORT_TITLE: Record<string, string> = {
  owner: 'Business Performance Report',
  marketing: 'Marketing Performance Report',
  sales: 'Sales Performance Report',
}

function buildFilename(role: string): string {
  const title = ROLE_REPORT_TITLE[role] ?? 'Performance Report'
  const dateLabel = new Intl.DateTimeFormat('en-CA').format(new Date()) // YYYY-MM-DD
  return `PC Merchandise - ${title} - ${dateLabel}.pdf`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role } = await params
  const expectedPath = ROLE_TO_PATH[session.user.role as Role]
  if (role !== expectedPath) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const origin = new URL(request.url).origin
  const printUrl = `${origin}/print/${role}/report?pdf=1`
  const cookieHeader = request.headers.get('cookie') ?? ''

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ cookie: cookieHeader })
    await page.goto(printUrl, { waitUntil: 'networkidle0' })
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
  } finally {
    await browser.close()
  }
}
