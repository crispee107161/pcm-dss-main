'use client'

import { useActionState, useOptimistic, useState, useTransition } from 'react'
import { createUser, updateUserRole, resetPassword, deactivateUser, reactivateUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Role = 'BUSINESS_OWNER' | 'MARKETING_TEAM' | 'MARKETING_MANAGER'

interface User {
  id: number
  email: string
  role: Role
  created_at: Date
  is_active: boolean
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

function FormAlert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null
  return (
    <Alert className={`mt-2 ${state.error ? 'border-status-negative/30 bg-status-negative/10 text-status-negative' : 'border-status-positive/30 bg-status-positive/10 text-status-positive'}`}>
      <AlertDescription className="text-sm">{state.error ?? state.success}</AlertDescription>
    </Alert>
  )
}

// ── Create User form ────────────────────────────────────────────────────────
function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, null)
  const [open, setOpen] = useState(false)

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
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full border-border focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="create-user-role" className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
              <Select name="role" defaultValue={ROLE_OPTIONS[0].value}>
                <SelectTrigger id="create-user-role" className="w-full border-border focus-visible:ring-ring">
                  <SelectValue>{roleLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
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
          <FormAlert state={state} />
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
  const [pwState, pwAction, pwPending] = useActionState(resetPassword, null)
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(deactivateUser, null)
  const [reactivateState, reactivateAction, reactivatePending] = useActionState(reactivateUser, null)
  // Deactivate/reactivate flips a Badge and swaps the whole action row (not
  // just button text), so it reads as "nothing happened yet" if the row
  // waits for the full round trip — this transition lets the optimistic
  // is_active flip (owned by the parent's useOptimistic) land the instant
  // the button is clicked, alongside the real action call.
  const [isActivePending, startActiveTransition] = useTransition()

  const [showPwForm, setShowPwForm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

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
          </div>
          {isSelf && <span className="text-xs text-status-negative">(you)</span>}
        </TableCell>
        <TableCell className="px-4 py-3">
          {isSelf ? (
            <Badge className={`${ROLE_BADGE_CLASS[user.role]} rounded-full text-xs font-medium h-auto py-0.5 px-2.5`}>
              {roleLabel(user.role)}
            </Badge>
          ) : (
            <form action={roleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <Select name="role" defaultValue={user.role}>
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
                type="submit"
                disabled={rolePending}
                size="xs"
                className="bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                {rolePending ? '…' : 'Save'}
              </Button>
            </form>
          )}
          {!isSelf && <FormAlert state={roleState} />}
        </TableCell>
        <TableCell className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap hidden md:table-cell">{formatDate(user.created_at)}</TableCell>
        <TableCell className="px-4 py-3">
          {!isSelf && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowPwForm(v => !v); setShowDeactivateConfirm(false) }}
                className="text-xs text-muted-foreground hover:text-status-warning underline underline-offset-2 transition-colors"
              >
                Reset PW
              </button>
              <span className="text-muted-foreground/50" aria-hidden="true">|</span>
              {user.is_active ? (
                <button
                  onClick={() => { setShowDeactivateConfirm(v => !v); setShowPwForm(false) }}
                  className="text-xs text-status-negative hover:text-status-negative/70 underline underline-offset-2 transition-colors"
                >
                  Deactivate
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    startActiveTransition(() => {
                      onOptimisticActiveChange(true)
                      reactivateAction(formData)
                    })
                  }}
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    disabled={reactivatePending || isActivePending}
                    className="text-xs text-status-positive hover:text-status-positive/70 underline underline-offset-2 transition-colors"
                  >
                    {(reactivatePending || isActivePending) ? 'Reactivating…' : 'Reactivate'}
                  </button>
                </form>
              )}
            </div>
          )}
          {/* Hoisted into this always-rendered cell (not the confirm row
              below) — that row unmounts synchronously on submit, so a
              FormAlert living inside it could never actually display a
              rejected deactivate's error. */}
          {!isSelf && <FormAlert state={deactivateState} />}
          {!isSelf && <FormAlert state={reactivateState} />}
        </TableCell>
      </TableRow>

      {/* Inline reset password form */}
      {showPwForm && !isSelf && (
        <TableRow className="border-t-0">
          <TableCell colSpan={5} className="px-4 pb-3">
            <form action={async (fd) => { await pwAction(fd); setShowPwForm(false) }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <label htmlFor={`reset-password-${user.id}`} className="block text-xs font-medium text-muted-foreground mb-1">New Password for {user.email}</label>
                <Input
                  id={`reset-password-${user.id}`}
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="border-border focus-visible:ring-ring"
                />
              </div>
              <Button
                type="submit"
                disabled={pwPending}
                className="bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                {pwPending ? 'Saving…' : 'Set Password'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPwForm(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <FormAlert state={pwState} />
            </form>
          </TableCell>
        </TableRow>
      )}

      {/* Inline deactivate confirmation */}
      {showDeactivateConfirm && !isSelf && (
        <TableRow className="border-t-0">
          <TableCell colSpan={5} className="px-4 pb-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                setShowDeactivateConfirm(false)
                startActiveTransition(() => {
                  onOptimisticActiveChange(false)
                  deactivateAction(formData)
                })
              }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-sm text-status-negative">
                Deactivate <strong>{user.email}</strong>? They won&apos;t be able to sign in. Their account and
                upload/audit history are kept, and you can reactivate them later.
              </p>
              <Button
                type="submit"
                disabled={deactivatePending || isActivePending}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {(deactivatePending || isActivePending) ? 'Deactivating…' : 'Yes, Deactivate'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowDeactivateConfirm(false)} className="text-muted-foreground">
                Cancel
              </Button>
            </form>
          </TableCell>
        </TableRow>
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
