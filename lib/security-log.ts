import { prisma } from '@/lib/prisma'
import type { SecurityEventType } from '@/app/generated/prisma/client'

interface LogSecurityEventInput {
  eventType: SecurityEventType
  userId?: number | null
  actorEmail?: string | null
  targetUserId?: number | null
  outcome: 'SUCCESS' | 'FAILURE'
  detail?: string
}

// SR-L1: the single centralized logging routine — every auth/account-admin
// event in the app (lib/auth.ts, actions/auth.ts, actions/admin.ts,
// actions/profile.ts) writes through this function, not through a direct
// prisma.securityEventLog.create() call of its own.
export async function logSecurityEvent(input: LogSecurityEventInput): Promise<void> {
  try {
    await prisma.securityEventLog.create({
      data: {
        event_type: input.eventType,
        user_id: input.userId ?? null,
        actor_email: input.actorEmail ?? null,
        target_user_id: input.targetUserId ?? null,
        outcome: input.outcome,
        detail: input.detail,
      },
    })
  } catch (err) {
    // SR-L4/SR-L7 in spirit: a logging failure must never break or leak
    // detail from the action it's observing — swallow and note server-side.
    console.error('Failed to write security event log:', err)
  }
}
