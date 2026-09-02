// Pure helpers extracted out of lib/auth.ts's authorize() so the lockout
// window and temp-password expiry boundaries are unit-testable without
// standing up NextAuth/Prisma.

// SR-A6 — a failure counts toward the current run only if the previous
// failure was within the window; otherwise it starts a fresh run at 1.
export function isWithinLockoutWindow(
  lastFailedLoginAt: Date | null,
  now: Date,
  windowMs: number
): boolean {
  return lastFailedLoginAt !== null && now.getTime() - lastFailedLoginAt.getTime() < windowMs
}

// SR-A8 — a temporary password stops working `ttlMs` after issuance even if
// never changed. Only meaningful while must_change_password is still set;
// a completed change clears both fields.
export function isTempPasswordExpired(
  mustChangePassword: boolean,
  tempPasswordExpiresAt: Date | null,
  now: Date
): boolean {
  return mustChangePassword && tempPasswordExpiresAt !== null && tempPasswordExpiresAt < now
}
