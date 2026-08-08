import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@auth/core/jwt'
import type { Role } from '@/types/index'

const roleRoutes: Record<Role, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  SALES_DIRECTOR: '/dashboard/sales',
  BUSINESS_OWNER: '/dashboard/owner',
}

type JwtToken = { role: Role; sub: string } | null

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  let token: JwtToken = null

  try {
    token = (await getToken({
      req,
      secret: process.env.AUTH_SECRET!,
      cookieName: '__Secure-authjs.session-token',
      salt: '__Secure-authjs.session-token',
    })) as JwtToken

    if (!token) {
      token = (await getToken({
        req,
        secret: process.env.AUTH_SECRET!,
        cookieName: 'authjs.session-token',
        salt: 'authjs.session-token',
      })) as JwtToken
    }
  } catch {
    // Token decode failed - treat as not logged in
  }

  const isLoggedIn = !!token
  const userRole = token?.role

  // Redirect logged-in users away from login page
  if (pathname === '/login' && isLoggedIn && userRole) {
    const dashboardPath = roleRoutes[userRole]
    if (dashboardPath) {
      return NextResponse.redirect(new URL(dashboardPath, req.nextUrl))
    }
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      // A session cookie present but undecodable means the token expired or
      // is invalid — tell the user why. No cookie at all means they were
      // never signed in, so send them to a plain login with no notice.
      const hadSessionCookie =
        req.cookies.has('__Secure-authjs.session-token') || req.cookies.has('authjs.session-token')
      const loginUrl = new URL('/login', req.nextUrl)
      if (hadSessionCookie) {
        loginUrl.searchParams.set('reason', 'expired')
      }
      return NextResponse.redirect(loginUrl)
    }

    if (userRole) {
      const allowedPath = roleRoutes[userRole]
      if (allowedPath && !pathname.startsWith(allowedPath)) {
        return NextResponse.redirect(new URL(allowedPath, req.nextUrl))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/dashboard/:path*'],
}
