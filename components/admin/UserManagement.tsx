'use client'

import { useActionState, useEffect, useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createUser, updateUserRole, resetPassword, deactivateUser, reactivateUser, unlockUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Role = 'BUSINESS_OWNER' | 'MARKETING_TEAM' | 'MARKETING_MANAGER'

interface User {
  id: number
  email: string
  role: Role
  created_at: Date
  is_active: boolean
  is_locked: boolean
}

// SR-A9 — every action below that modifies an existing account requires the
// acting Owner to re-enter their own current password. One shared field so
// every form/dialog asks for it the same way.
function ReauthField() {
  return (
    <div className="mt-3">
      <label htmlFor="reauth_password" className="block text-xs font-medium text-muted-foreground mb-1">
        Confirm your password
      </label>
      <Input
        id="reauth_password"
        name="reauth_password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Your current password"
        className="border-border focus-visible:ring-ring"
      />
    </div>
  )
}

interface Props {
  users: User[]
  currentUserId: number
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
  { value: 'MARKETING_MANAGER', label: 'Marketing Manager' },
  { value: 'MARKETING_TEAM', label: 'Marketing Team Member' },
]

// SelectValue's default label lookup depends on the popup's SelectItems having
// registered into base-ui's internal store, which only happens once the popup
// has mounted (i.e. after the Select is opened at least once) — until then it
// falls back to the raw value. Resolving the label ourselves from ROLE_OPTIONS
// keeps the trigger text correct from first paint.
function roleLabel(value: string | null) {
  return ROLE_OPTIONS.find(r => r.value === value)?.label ?? value ?? ''
}

const ROLE_BADGE_CLASS: Record<Role, string> = {
  BUSINESS_OWNER: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  MARKETING_TEAM: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  MARKETING_MANAGER: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

// useActionState's result has no built-in reset — it just sits there until
// the action fires again. `state` is a fresh object on every dispatch, so
// keying the effect on it fires exactly one toast per result. `toastId` is
// stable per row/form so a repeat save replaces its previous toast instead
// of stacking (and absorbs React StrictMode's double effect invocation in
// dev).
function useActionToast(state: { error?: string; success?: string } | null, toastId: string) {
  useEffect(() => {
    if (state?.error) toast.error(state.error, { id: toastId })
    else if (state?.success) toast.success(state.success, { id: toastId })
  }, [state, toastId])
}

// ── Create User form ────────────────────────────────────────────────────────
function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, null)
  const [open, setOpen] = useState(false)
  useActionToast(state, 'create-user')

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-foreground">All Users</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage roles, passwords, and access</p>
        </div>
        <Button
          onClick={() => setOpen(v => !v)}
          className="px-4"
        >
          {open ? 'Cancel' : '+ Add User'}
        </Button>
      </div>

      {open && (
        <form action={async (fd) => { await action(fd); if (!state?.error) setOpen(false) }} className="bg-secondary border border-border rounded-2xl p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-4">Create New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="create-user-email" className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <Input
                id="create-user-email"
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                className="w-full border-border focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="create-user-password" className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
              <Input
                id="create-user-password"
                name="password"
                type="password"
                required
                minLength={12}
                placeholder="Min. 12 characters"
                className="w-full border-border focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="create-user-role" className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
              <Select name="role" defaultValue={ROLE_OPTIONS[0].value}>
                <SelectTrigger id="create-user-role" className="w-full border-border focus-visible:ring-ring">
                  <SelectValue>{roleLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value} label={r.label}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button
              type="submit"
              disabled={pending}
              className="px-4"
            >
              {pending ? 'Creating…' : 'Create User'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Per-user row actions ────────────────────────────────────────────────────
function UserRow({
  user, currentUserId, onOptimisticActiveChange,
}: {
  user: User
  currentUserId: number
  onOptimisticActiveChange: (isActive: boolean) => void
}) {
  const isSelf = user.id === currentUserId

  const [roleState, roleAction, rolePending] = useActionState(updateUserRole, null)
  // Select is controlled so Save can be disabled while the picked role
  // matches the user's current role — without this, clicking Save with
  // nothing changed still submits the current role and reports a false
  // "Role updated." On success revalidatePath brings the new `user.role`
  // prop down, which already equals `selectedRole`, so Save re-disables
  // itself with no extra code. On a rejected save the prop is unchanged, so
  // Save stays enabled for a retry.
  const [selectedRole, setSelectedRole] = useState<Role>(user.role)
  const isRoleUnchanged = selectedRole === user.role
  const [pwState, pwAction, pwPending] = useActionState(resetPassword, null)
  const [deactivateState, deactivateAction] = useActionState(deactivateUser, null)
  const [reactivateState, reactivateAction] = useActionState(reactivateUser, null)
  // Deactivate/reactivate flips a Badge and swaps the whole action row (not
  // just button text), so it reads as "nothing happened yet" if the row
  // waits for the full round trip — this transition lets the optimistic
  // is_active flip (owned by the parent's useOptimistic) land the instant
  // the button is clicked, alongside the real action call.
  const [isActivePending, startActiveTransition] = useTransition()
  // Which action is in flight, independent of the optimistic is_active flip
  // above. That flip changes `user.is_active` synchronously, which is what
  // decides whether this row renders the Deactivate button or the Reactivate
  // form below — without this, clicking Deactivate flips is_active to false
  // *before* the request settles, so the row instantly swaps to the
  // Reactivate branch and shows *its* pending label ("Reactivating…") for
  // an action nobody clicked. Tracking the actual action keeps the row
  // showing the button that was clicked, correctly disabled and labelled,
  // until the transition settles (cleared below once isActivePending drops).
  const [pendingAction, setPendingAction] = useState<'activate' | 'deactivate' | null>(null)
  useEffect(() => {
    if (!isActivePending) setPendingAction(null)
  }, [isActivePending])

  // Each modal below reuses its open state for both the confirm step and the
  // result step (deactivateState/reactivateState/pwState no longer feed a
  // shared inline alert — each result renders inside the dialog that
  // triggered it). `xSubmitted` switches a dialog from its confirm view to
  // its result view, and is reset to false whenever the dialog is reopened
  // (in onOpenChange) so a stale previous result doesn't flash on reopen.
  const [showPwForm, setShowPwForm] = useState(false)
  const [pwSubmitted, setPwSubmitted] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateSubmitted, setDeactivateSubmitted] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [reactivateSubmitted, setReactivateSubmitted] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [roleSubmitted, setRoleSubmitted] = useState(false)
  const [unlockState, unlockAction, unlockPending] = useActionState(unlockUser, null)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false)
  const [unlockSubmitted, setUnlockSubmitted] = useState(false)

  return (
    <>
      <TableRow className="border-t border-border align-top">
        <TableCell className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">#{user.id}</TableCell>
        <TableCell className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground text-sm">{user.email}</span>
            {!user.is_active && (
              <Badge className="bg-secondary text-muted-foreground border-border rounded-full text-[10px] font-medium h-auto py-0 px-2">
                Inactive
              </Badge>
            )}
            {user.is_locked && (
              <Badge className="bg-status-negative/10 text-status-negative border-status-negative/30 rounded-full text-[10px] font-medium h-auto py-0 px-2">
                Locked
              </Badge>
            )}
          </div>
          {isSelf && <span className="text-xs text-status-negative">(you)</span>}
        </TableCell>
        <TableCell className="px-4 py-3">
          {isSelf ? (
            <Badge className={`${ROLE_BADGE_CLASS[user.role]} rounded-full text-xs font-medium h-auto py-0.5 px-2.5`}>
              {roleLabel(user.role)}
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Select name="role" value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                {/* Fixed width (not just min-w) so the trigger box doesn't grow/shrink
                    with the selected label's length — keeps the Save button lined up
                    in a straight column across rows regardless of which role is shown. */}
                <SelectTrigger className="border-border focus-visible:ring-ring h-7 text-xs w-52" size="sm">
                  <SelectValue>{roleLabel}</SelectValue>
                </SelectTrigger>
                {/* alignItemWithTrigger={false}: base-ui's default popup positioning
                    overlays the list directly on top of the trigger, which spills the
                    list across the row below and visually collides with its Save
                    button. Normal dropdown positioning (opens below the trigger)
                    avoids that. Popup width stays default (== trigger width) — it
                    doesn't need to stretch over the Save button; base-ui's Select is
                    modal, so the button is inert while the popup is open anyway. */}
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value} label={r.label}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => setShowRoleConfirm(true)}
                disabled={rolePending || isRoleUnchanged}
                size="xs"
                className="bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                {rolePending ? '…' : 'Save'}
              </Button>
            </div>
          )}
        </TableCell>
        <TableCell className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap hidden md:table-cell">{formatDate(user.created_at)}</TableCell>
        <TableCell className="px-4 py-3">
          {!isSelf && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPwForm(true)}
                className="text-xs text-muted-foreground hover:text-status-warning underline underline-offset-2 transition-colors"
              >
                Reset PW
              </button>
              {user.is_locked && (
                <>
                  <span className="text-muted-foreground/50" aria-hidden="true">|</span>
                  <button
                    onClick={() => setShowUnlockConfirm(true)}
                    className="text-xs text-status-warning hover:text-status-warning/70 underline underline-offset-2 transition-colors"
                  >
                    Unlock
                  </button>
                </>
              )}
              <span className="text-muted-foreground/50" aria-hidden="true">|</span>
              {(pendingAction === 'deactivate' || (pendingAction === null && user.is_active)) ? (
                <button
                  onClick={() => setShowDeactivateConfirm(true)}
                  disabled={pendingAction === 'deactivate'}
                  className="text-xs text-status-negative hover:text-status-negative/70 underline underline-offset-2 transition-colors disabled:opacity-60"
                >
                  {pendingAction === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
                </button>
              ) : (
                <button
                  onClick={() => setShowReactivateConfirm(true)}
                  disabled={pendingAction === 'activate'}
                  className="text-xs text-status-positive hover:text-status-positive/70 underline underline-offset-2 transition-colors disabled:opacity-60"
                >
                  {pendingAction === 'activate' ? 'Reactivating…' : 'Reactivate'}
                </button>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>

      {!isSelf && (
        <Dialog
          open={showPwForm}
          onOpenChange={(open) => { setShowPwForm(open); if (open) setPwSubmitted(false) }}
        >
          <DialogContent>
            {!pwSubmitted ? (
              <>
                <DialogHeader>
                  <DialogTitle>Reset password for {user.email}</DialogTitle>
                  <DialogDescription>
                    This sets a temporary password. They must change it within 24 hours of their next sign-in, and it
                    also clears any account lockout.
                  </DialogDescription>
                </DialogHeader>
                <form action={async (fd) => { setPwSubmitted(true); await pwAction(fd) }}>
                  <input type="hidden" name="userId" value={user.id} />
                  <label htmlFor={`reset-password-${user.id}`} className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
                  <Input
                    id={`reset-password-${user.id}`}
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    placeholder="Min. 12 characters"
                    className="border-border focus-visible:ring-ring"
                  />
                  <ReauthField />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowPwForm(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={pwPending} className="text-xs">
                      {pwPending ? 'Saving…' : 'Set Password'}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{pwPending ? 'Resetting password…' : pwState?.error ? 'Password reset failed' : 'Password reset'}</DialogTitle>
                  <DialogDescription className={pwPending ? undefined : pwState?.error ? 'text-status-negative' : 'text-status-positive'}>
                    {pwPending ? `Setting a new password for ${user.email}…` : (pwState?.error ?? pwState?.success ?? '')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton />
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {!isSelf && (
        <Dialog
          open={showDeactivateConfirm}
          onOpenChange={(open) => { setShowDeactivateConfirm(open); if (open) setDeactivateSubmitted(false) }}
        >
          <DialogContent>
            {!deactivateSubmitted ? (
              <>
                <DialogHeader>
                  <DialogTitle>Deactivate {user.email}?</DialogTitle>
                  <DialogDescription>
                    They won&apos;t be able to sign in. Their account and upload/audit history are kept, and you can
                    reactivate them later.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    setDeactivateSubmitted(true)
                    setPendingAction('deactivate')
                    startActiveTransition(() => {
                      onOptimisticActiveChange(false)
                      deactivateAction(formData)
                    })
                  }}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <ReauthField />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowDeactivateConfirm(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-500 text-white text-xs">
                      Yes, Deactivate
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {pendingAction === 'deactivate' ? 'Deactivating…' : deactivateState?.error ? 'Deactivation failed' : 'Deactivated'}
                  </DialogTitle>
                  <DialogDescription className={pendingAction === 'deactivate' ? undefined : deactivateState?.error ? 'text-status-negative' : 'text-status-positive'}>
                    {pendingAction === 'deactivate'
                      ? `Deactivating ${user.email}…`
                      : (deactivateState?.error ?? deactivateState?.success ?? '')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton />
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {!isSelf && (
        <Dialog
          open={showReactivateConfirm}
          onOpenChange={(open) => { setShowReactivateConfirm(open); if (open) setReactivateSubmitted(false) }}
        >
          <DialogContent>
            {!reactivateSubmitted ? (
              <>
                <DialogHeader>
                  <DialogTitle>Reactivate {user.email}?</DialogTitle>
                  <DialogDescription>They&apos;ll be able to sign in again.</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    setReactivateSubmitted(true)
                    setPendingAction('activate')
                    startActiveTransition(() => {
                      onOptimisticActiveChange(true)
                      reactivateAction(formData)
                    })
                  }}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <ReauthField />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowReactivateConfirm(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Yes, Reactivate
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {pendingAction === 'activate' ? 'Reactivating…' : reactivateState?.error ? 'Reactivation failed' : 'Reactivated'}
                  </DialogTitle>
                  <DialogDescription className={pendingAction === 'activate' ? undefined : reactivateState?.error ? 'text-status-negative' : 'text-status-positive'}>
                    {pendingAction === 'activate'
                      ? `Reactivating ${user.email}…`
                      : (reactivateState?.error ?? reactivateState?.success ?? '')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton />
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {!isSelf && (
        <Dialog
          open={showRoleConfirm}
          onOpenChange={(open) => { setShowRoleConfirm(open); if (open) setRoleSubmitted(false) }}
        >
          <DialogContent>
            {!roleSubmitted ? (
              <>
                <DialogHeader>
                  <DialogTitle>Change {user.email}&apos;s role to {roleLabel(selectedRole)}?</DialogTitle>
                  <DialogDescription>This takes effect on their next request, even mid-session.</DialogDescription>
                </DialogHeader>
                <form action={async (fd) => { setRoleSubmitted(true); await roleAction(fd) }}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="role" value={selectedRole} />
                  <ReauthField />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowRoleConfirm(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={rolePending} className="text-xs">
                      {rolePending ? 'Saving…' : 'Confirm'}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{rolePending ? 'Updating role…' : roleState?.error ? 'Role change failed' : 'Role updated'}</DialogTitle>
                  <DialogDescription className={rolePending ? undefined : roleState?.error ? 'text-status-negative' : 'text-status-positive'}>
                    {rolePending ? `Updating ${user.email}…` : (roleState?.error ?? roleState?.success ?? '')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton />
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {!isSelf && user.is_locked && (
        <Dialog
          open={showUnlockConfirm}
          onOpenChange={(open) => { setShowUnlockConfirm(open); if (open) setUnlockSubmitted(false) }}
        >
          <DialogContent>
            {!unlockSubmitted ? (
              <>
                <DialogHeader>
                  <DialogTitle>Unlock {user.email}?</DialogTitle>
                  <DialogDescription>Clears the lockout and resets their failed sign-in count. Their password is unchanged.</DialogDescription>
                </DialogHeader>
                <form action={async (fd) => { setUnlockSubmitted(true); await unlockAction(fd) }}>
                  <input type="hidden" name="userId" value={user.id} />
                  <ReauthField />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowUnlockConfirm(false)} className="text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={unlockPending} className="text-xs">
                      {unlockPending ? 'Unlocking…' : 'Unlock'}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{unlockPending ? 'Unlocking…' : unlockState?.error ? 'Unlock failed' : 'Unlocked'}</DialogTitle>
                  <DialogDescription className={unlockPending ? undefined : unlockState?.error ? 'text-status-negative' : 'text-status-positive'}>
                    {unlockPending ? `Unlocking ${user.email}…` : (unlockState?.error ?? unlockState?.success ?? '')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter showCloseButton />
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function UserManagement({ users, currentUserId }: Props) {
  // Owns the optimistic is_active flip for every row — reverts to the real
  // `users` prop on its own once the triggering transition settles (React's
  // useOptimistic semantics), so a rejected deactivate/reactivate snaps the
  // badge back without any manual rollback code here.
  const [optimisticUsers, setOptimisticActive] = useOptimistic(
    users,
    (state, update: { id: number; is_active: boolean }) =>
      state.map(u => (u.id === update.id ? { ...u, is_active: update.is_active } : u))
  )

  return (
    <div>
      <CreateUserForm />

      <div className="bg-card rounded-2xl card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary">
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">ID</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Email</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Role</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Created</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticUsers.map(user => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                onOptimisticActiveChange={(isActive) => setOptimisticActive({ id: user.id, is_active: isActive })}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
