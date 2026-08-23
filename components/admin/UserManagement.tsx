'use client'

import { useActionState, useState } from 'react'
import { createUser, updateUserRole, resetPassword, deleteUser } from '@/actions/admin'
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
function UserRow({ user, currentUserId }: { user: User; currentUserId: number }) {
  const isSelf = user.id === currentUserId

  const [roleState, roleAction, rolePending] = useActionState(updateUserRole, null)
  const [pwState, pwAction, pwPending] = useActionState(resetPassword, null)
  const [delState, delAction, delPending] = useActionState(deleteUser, null)

  const [showPwForm, setShowPwForm] = useState(false)
  const [showDelConfirm, setShowDelConfirm] = useState(false)

  return (
    <>
      <TableRow className="border-t border-border align-top">
        <TableCell className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">#{user.id}</TableCell>
        <TableCell className="px-4 py-3">
          <div className="font-medium text-foreground text-sm">{user.email}</div>
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
                onClick={() => { setShowPwForm(v => !v); setShowDelConfirm(false) }}
                className="text-xs text-muted-foreground hover:text-status-warning underline underline-offset-2 transition-colors"
              >
                Reset PW
              </button>
              <span className="text-muted-foreground/50" aria-hidden="true">|</span>
              <button
                onClick={() => { setShowDelConfirm(v => !v); setShowPwForm(false) }}
                className="text-xs text-status-negative hover:text-status-negative/70 underline underline-offset-2 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
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

      {/* Inline delete confirmation */}
      {showDelConfirm && !isSelf && (
        <TableRow className="border-t-0">
          <TableCell colSpan={5} className="px-4 pb-3">
            <form action={async (fd) => { await delAction(fd); setShowDelConfirm(false) }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-sm text-status-negative">
                Are you sure you want to delete <strong>{user.email}</strong>? This cannot be undone.
              </p>
              <Button
                type="submit"
                disabled={delPending}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {delPending ? 'Deleting…' : 'Yes, Delete'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowDelConfirm(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <FormAlert state={delState} />
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function UserManagement({ users, currentUserId }: Props) {
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
            {users.map(user => (
              <UserRow key={user.id} user={user} currentUserId={currentUserId} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
