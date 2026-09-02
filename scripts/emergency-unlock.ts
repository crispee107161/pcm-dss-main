// Emergency recovery only — SR-A6's lockout is released by the Marketing
// Manager or the Owner from inside the app (User Management → Unlock), but
// there is exactly one BUSINESS_OWNER account in this system and no
// super-admin above it. If that account locks itself out, no in-app path
// can unlock it: `requireOwner()` gates every admin action, including
// unlock, to a role that account can no longer authenticate into.
//
// This script is that fallback. It requires direct DATABASE_URL access
// (the same trust boundary every other script in this directory already
// assumes), not a web route, and is not wired into the running application.
//
// Usage: npx tsx scripts/emergency-unlock.ts owner@pcmerchandise.com

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { logSecurityEvent } from '../lib/security-log'

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Usage: npx tsx scripts/emergency-unlock.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found for ${email}`)
    process.exit(1)
  }

  if (!user.is_locked) {
    console.log(`${email} is not locked — nothing to do.`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { is_locked: false, locked_at: null, failed_login_attempts: 0, last_failed_login_at: null },
  })
  // This is precisely the kind of event the audit trail exists to catch —
  // a lockout release with no in-app actor and no SR-A9 re-authentication.
  await logSecurityEvent({
    eventType: 'ACCOUNT_UNLOCKED',
    userId: user.id,
    actorEmail: 'script:emergency-unlock',
    targetUserId: user.id,
    outcome: 'SUCCESS',
    detail: `${email} — unlocked via scripts/emergency-unlock.ts (DB-shell access, bypasses SR-A9 reauth)`,
  })
  console.log(`Unlocked ${email}. This bypasses the app's re-authentication gate (SR-A9) — use only when the account genuinely has no other recovery path, and tell the account owner it happened.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
