import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logSecurityEvent } from '@/lib/security-log'
import { isWithinLockoutWindow, isTempPasswordExpired } from '@/lib/auth-lockout'
import type { Role } from '@/types/index'

// SR-A6 — five consecutive failures within a 15-minute window locks the
// account. The window resets the counter (not the lock itself — see the
// schema comment on User.is_locked) if the previous failure was longer ago
// than this.
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const email = credentials.email as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        // SR-A4 — every rejection path below returns the same `null` with
        // no distinguishing detail visible to the client; the specifics
        // (which condition failed) only ever reach the security log.
        if (!user || !user.is_active) {
          await logSecurityEvent({
            eventType: 'SIGN_IN_FAILURE',
            actorEmail: email,
            outcome: 'FAILURE',
            detail: !user ? 'unknown email' : 'inactive account',
          })
          return null
        }

        if (user.is_locked) {
          await logSecurityEvent({
            eventType: 'SIGN_IN_FAILURE',
            userId: user.id,
            actorEmail: email,
            outcome: 'FAILURE',
            detail: 'account locked',
          })
          return null
        }

        // SR-A8 — a temporary password issued via admin reset stops working
        // 24h after issuance even if it was never changed.
        if (isTempPasswordExpired(user.must_change_password, user.temp_password_expires_at, new Date())) {
          await logSecurityEvent({
            eventType: 'SIGN_IN_FAILURE',
            userId: user.id,
            actorEmail: email,
            outcome: 'FAILURE',
            detail: 'temporary password expired',
          })
          return null
        }

        const passwordMatch = await bcryptjs.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!passwordMatch) {
          const withinWindow = isWithinLockoutWindow(user.last_failed_login_at, new Date(), LOCKOUT_WINDOW_MS)

          // Read-modify-write on failed_login_attempts would let two
          // concurrent bad guesses both read the same count and both write
          // back the same incremented value, undercounting attempts. A
          // transaction with an atomic `increment` (or a reset to 1 outside
          // the window) closes that race — the final row reflects every
          // attempt regardless of interleaving.
          const updated = await prisma.$transaction(async (tx) => {
            return tx.user.update({
              where: { id: user.id },
              data: {
                failed_login_attempts: withinWindow ? { increment: 1 } : 1,
                last_failed_login_at: new Date(),
              },
            })
          })
          const attempts = updated.failed_login_attempts
          const shouldLock = attempts >= LOCKOUT_THRESHOLD
          if (shouldLock) {
            await prisma.user.update({
              where: { id: user.id },
              data: { is_locked: true, locked_at: new Date() },
            })
          }

          await logSecurityEvent({
            eventType: 'SIGN_IN_FAILURE',
            userId: user.id,
            actorEmail: email,
            outcome: 'FAILURE',
            detail: `bad password (attempt ${attempts}/${LOCKOUT_THRESHOLD})`,
          })
          if (shouldLock) {
            await logSecurityEvent({
              eventType: 'ACCOUNT_LOCKED',
              userId: user.id,
              actorEmail: email,
              outcome: 'SUCCESS',
              detail: `${LOCKOUT_THRESHOLD} consecutive failed attempts within ${LOCKOUT_WINDOW_MS / 60000} minutes`,
            })
          }
          return null
        }

        // Success — clear the failure counter and lock state.
        await prisma.user.update({
          where: { id: user.id },
          data: { failed_login_attempts: 0, last_failed_login_at: null },
        })
        await logSecurityEvent({
          eventType: 'SIGN_IN_SUCCESS',
          userId: user.id,
          actorEmail: email,
          outcome: 'SUCCESS',
        })

        return {
          id: String(user.id),
          email: user.email,
          role: user.role as Role,
          mustChangePassword: user.must_change_password,
        }
      },
    }),
  ],
  callbacks: {
    // FR-02 — a deactivated user must lose access, not just be blocked from
    // their *next* login. JWT sessions carry no server-side state by
    // default, so without this a deactivated user's existing token stays
    // valid until it naturally expires (maxAge below). Re-checking
    // is_active here (not just at sign-in) costs one query per request at
    // this account's scale (~10 staff) and closes that gap — see
    // docs/raven/Four_Remaining_Gaps_Please_Confirm.md §4. Returning `null`
    // invalidates the token; every page/Server Action already treats a null
    // session as logged-out (`if (!session?.user) redirect('/login')`).
    //
    // SR-Z9 — the same per-request check also re-reads role and
    // must_change_password, so a role change or an admin-issued password
    // reset takes effect on the user's very next request rather than
    // waiting for the JWT to naturally expire.
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: Role; mustChangePassword?: boolean }
        token.role = u.role
        token.sub = user.id
        token.mustChangePassword = u.mustChangePassword ?? false
        return token
      }
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.sub) },
          select: { is_active: true, is_locked: true, role: true, must_change_password: true },
        })
        if (!dbUser || !dbUser.is_active || dbUser.is_locked) {
          return null
        }
        token.role = dbUser.role
        token.mustChangePassword = dbUser.must_change_password
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as Role
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Internal business dashboard handling ad-spend/financial data —
    // keep sessions to a working day rather than NextAuth's 30-day default.
    maxAge: 60 * 60 * 8,
  },
})
