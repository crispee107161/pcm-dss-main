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
      userName: string | null
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
      userName: string | null
      userRole: string
      summary: string
      detail: string
    }
  | {
      kind: 'SECURITY'
      id: number
      at: Date
      userEmail: string
      userName: string | null
      userRole: string
      summary: string
      detail: string
      status: 'SUCCESS' | 'FAILED'
    }

const SECURITY_EVENT_LABEL: Record<string, string> = {
  SIGN_IN_SUCCESS: 'Signed in',
  SIGN_IN_FAILURE: 'Sign-in failed',
  SIGN_OUT: 'Signed out',
  ACCOUNT_LOCKED: 'Account locked',
  ACCOUNT_UNLOCKED: 'Account unlocked',
  PASSWORD_CHANGE: 'Password changed',
  PASSWORD_RESET: 'Password reset by admin',
  ACCOUNT_CREATED: 'Account created',
  ROLE_CHANGED: 'Role changed',
  ACCOUNT_DEACTIVATED: 'Account deactivated',
  ACCOUNT_REACTIVATED: 'Account reactivated',
  AUTHORIZATION_DENIED: 'Authorization denied',
}

const CATEGORY_ACTION_LABEL: Record<string, string> = {
  PROPOSE: 'Proposed category',
  ACCEPT: 'Accepted proposal',
  REJECT: 'Rejected proposal',
  OVERRIDE: 'Set final category',
  BULK_ACCEPT: 'Bulk-accepted proposal',
  // docs/raven/Provenance_Followup_and_Revised_Order.md exploration
  // (2026-08-23) — missing entry meant every batchConfirmAgreed row rendered
  // the raw enum string ("BATCH_CONFIRM — post #123") instead of a label.
  BATCH_CONFIRM: 'Batch-confirmed agreed category',
}

function categoryLabel(label: string | null): string {
  return label ? (CATEGORY_LABEL_DISPLAY[label as keyof typeof CATEGORY_LABEL_DISPLAY] ?? label) : 'none'
}

export interface AuditLogPage {
  events: AuditEvent[]
  totalUploads: number
  totalCategoryActions: number
  totalSecurityEvents: number
}

export async function loadAuditLog(limit = 100): Promise<AuditLogPage> {
  const [uploads, categoryActions, securityEvents, totalUploads, totalCategoryActions, totalSecurityEvents] = await Promise.all([
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: limit,
      include: { user: { select: { email: true, name: true, role: true } } },
    }),
    prisma.categoryAuditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { user: { select: { email: true, name: true, role: true } } },
    }),
    // SR-L1/L2/L3 — auth and account-admin events (sign-in, lockout, role
    // change, etc.), merged into the same timeline as uploads/category
    // decisions. user is nullable (a failed sign-in against an unknown
    // email has no row to join), so actor_email is the display fallback.
    prisma.securityEventLog.findMany({
      orderBy: { at: 'desc' },
      take: limit,
      include: { user: { select: { email: true, name: true, role: true } } },
    }),
    prisma.uploadLog.count(),
    prisma.categoryAuditLog.count(),
    prisma.securityEventLog.count(),
  ])

  const uploadEvents: AuditEvent[] = uploads.map((log) => ({
    kind: 'UPLOAD',
    id: log.id,
    at: log.uploaded_at,
    userEmail: log.user.email,
    userName: log.user.name,
    userRole: log.user.role,
    summary: `${log.status === 'SUCCESS' ? 'Uploaded' : 'Failed to upload'} ${log.filename}`,
    detail: log.status === 'SUCCESS'
      ? `${log.upload_type.replace(/_/g, ' ')} — ${log.records_inserted} inserted, ${log.records_updated} updated, ${log.records_unchanged} unchanged` +
        (log.records_rejected > 0 ? `, ${log.records_rejected} rejected (${log.rejected_reasons ?? 'see file'})` : '')
      : log.error_message ?? 'Upload failed',
    status: log.status,
  }))

  const categoryEvents: AuditEvent[] = categoryActions.map((log) => ({
    kind: 'CATEGORY',
    id: log.id,
    at: log.created_at,
    userEmail: log.user.email,
    userName: log.user.name,
    userRole: log.user.role,
    summary: `${CATEGORY_ACTION_LABEL[log.action] ?? log.action} — post #${log.facebook_post_id}`,
    detail: `${categoryLabel(log.previous_category)} → ${categoryLabel(log.new_category)}`,
  }))

  const securityLogEvents: AuditEvent[] = securityEvents.map((log) => ({
    kind: 'SECURITY',
    id: log.id,
    at: log.at,
    userEmail: log.user?.email ?? log.actor_email ?? 'unknown',
    userName: log.user?.name ?? null,
    userRole: log.user?.role ?? '—',
    summary: SECURITY_EVENT_LABEL[log.event_type] ?? log.event_type,
    detail: log.detail ?? '',
    status: log.outcome === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
  }))

  const events = [...uploadEvents, ...categoryEvents, ...securityLogEvents]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit)

  return { events, totalUploads, totalCategoryActions, totalSecurityEvents }
}
