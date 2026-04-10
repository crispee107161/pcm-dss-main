import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@auth/core/jwt'
import type { Role } from '@/types/index'

const roleRoutes: Record<Role, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  SALES_DIRECTOR: '/dashboard/sales',
  BUSINESS_OWNER: '/dashboard/owner',
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Get JWT token from cookie (edge-compatible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let token: any = null

  try {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET!,
      cookieName: '__Secure-authjs.session-token',
      salt: '__Secure-authjs.session-token',
    })

    if (!token) {
      token = await getToken({
        req,
        secret: process.env.AUTH_SECRET!,
        cookieName: 'authjs.session-token',
        salt: 'authjs.session-token',
      })
    }
  } catch {
    // Token decode failed - treat as not logged in
  }

  const isLoggedIn = !!token
  const userRole = token?.role as Role | undefined

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
      return NextResponse.redirect(new URL('/login', req.nextUrl))
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
