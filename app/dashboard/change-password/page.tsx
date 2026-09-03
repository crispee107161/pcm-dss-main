import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { ForcePasswordChangeForm } from '@/components/auth/ForcePasswordChangeForm'
import type { Role } from '@/types/index'

const roleRoutes: Record<Role, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  MARKETING_TEAM: '/dashboard/marketing',
  BUSINESS_OWNER: '/dashboard/owner',
}

// SR-A8 — reached via middleware.ts's forced redirect whenever the signed-in
// user's temporary password hasn't been changed yet. Not gated by role: any
// authenticated user with must_change_password can land here.
export default async function ChangePasswordPage() {
  const session = await requireSession()

  const dashboardPath = roleRoutes[session.user.role]

  // Not reached via the forced middleware redirect unless must_change_password
  // is set — a user who navigates here directly without it would otherwise see
  // "your administrator issued a temporary password" copy that doesn't apply.
  if (!session.user.mustChangePassword) redirect(dashboardPath)

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium text-foreground">
          <img src="/pcm-logo.png" alt="" className="size-6 object-contain" />
          PCM <span className="text-muted-foreground font-normal">Decision Support</span>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-border-lg">
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Your administrator issued a temporary password. Choose a new one to continue.
            </p>
          </div>
          <ForcePasswordChangeForm dashboardPath={dashboardPath} />
        </div>
      </div>
    </div>
  )
}
