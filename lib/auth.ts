import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcryptjs from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/types/index'

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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.is_active) {
          return null
        }

        const passwordMatch = await bcryptjs.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: String(user.id),
          email: user.email,
          role: user.role as Role,
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role
        token.sub = user.id
        return token
      }
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.sub) },
          select: { is_active: true },
        })
        if (!dbUser || !dbUser.is_active) {
          return null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as Role
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
