import { signOut } from '@/lib/auth'

// lib/auth.ts's jwt callback can invalidate a session server-side
// (deactivated/locked account, FR-02/SR-A6) without the browser's session
// cookie itself becoming invalid — a Server Component can't clear cookies.
// requireSession() (lib/auth-guard.ts) redirects here instead of a bare
// redirect('/login') so the cookie actually gets cleared via signOut,
// stopping middleware's raw getToken() check from seeing a still-valid JWT
// and looping back to /dashboard. This path is reached specifically because
// the account was revoked mid-session, not because the JWT itself expired
// (a naturally expired/undecodable cookie is caught by middleware directly,
// with reason=expired) — so the notice here says so.
export async function GET() {
  return signOut({ redirectTo: '/login?reason=revoked' })
}
