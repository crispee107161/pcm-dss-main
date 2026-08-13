import { prisma } from '@/lib/prisma'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'

// FR-24 audit trail — S11. Merges the two event sources the requirement
// names ("every upload and every manual category assignment") into one
// chronological timeline: UploadLog (existing) and CategoryAuditLog
// (added for this screen). Deliberately not a single unified table — the
// two event shapes are different enough (a file vs. a single post decision)
// that forcing one schema would lose fields either side needs.
export type AuditEvent =
  | {
      kind: 'UPLOAD'
      id: number
      at: Date
      userEmail: string
      userRole: string
      summary: string
      detail: string
      status: 'SUCCESS' | 'FAILED'
    }
  | {
      kind: 'CATEGORY'
      id: number
      at: Date
      userEmail: string
      userRole: string
      summary: string
      detail: string
    }

const CATEGORY_ACTION_LABEL: Record<string, string> = {
  PROPOSE: 'Proposed category',
  ACCEPT: 'Accepted proposal',
  REJECT: 'Rejected proposal',
  OVERRIDE: 'Set final category',
  BULK_ACCEPT: 'Bulk-accepted proposal',
}

function categoryLabel(label: string | null): string {
  return label ? (CATEGORY_LABEL_DISPLAY[label as keyof typeof CATEGORY_LABEL_DISPLAY] ?? label) : 'none'
}

export interface AuditLogPage {
  events: AuditEvent[]
  totalUploads: number
  totalCategoryActions: number
}

export async function loadAuditLog(limit = 100): Promise<AuditLogPage> {
  const [uploads, categoryActions, totalUploads, totalCategoryActions] = await Promise.all([
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: limit,
      include: { user: { select: { email: true, role: true } } },
    }),
    prisma.categoryAuditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { user: { select: { email: true, role: true } } },
    }),
    prisma.uploadLog.count(),
    prisma.categoryAuditLog.count(),
  ])

  const uploadEvents: AuditEvent[] = uploads.map((log) => ({
    kind: 'UPLOAD',
    id: log.id,
    at: log.uploaded_at,
    userEmail: log.user.email,
    userRole: log.user.role,
    summary: `${log.status === 'SUCCESS' ? 'Uploaded' : 'Failed to upload'} ${log.filename}`,
    detail: log.status === 'SUCCESS'
      ? `${log.upload_type.replace(/_/g, ' ')} — ${log.records_inserted} inserted, ${log.records_updated} updated, ${log.records_unchanged} unchanged`
      : log.error_message ?? 'Upload failed',
    status: log.status,
  }))

  const categoryEvents: AuditEvent[] = categoryActions.map((log) => ({
    kind: 'CATEGORY',
    id: log.id,
    at: log.created_at,
    userEmail: log.user.email,
    userRole: log.user.role,
    summary: `${CATEGORY_ACTION_LABEL[log.action] ?? log.action} — post #${log.facebook_post_id}`,
    detail: `${categoryLabel(log.previous_category)} → ${categoryLabel(log.new_category)}`,
  }))

  const events = [...uploadEvents, ...categoryEvents]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit)

  return { events, totalUploads, totalCategoryActions }
}
