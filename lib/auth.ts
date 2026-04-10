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

        if (!user) {
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role
        token.sub = user.id
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
  },
})
