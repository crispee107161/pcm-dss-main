'use client'

import { useActionState, useState } from 'react'
import { createUser, updateUserRole, resetPassword, deleteUser } from '@/actions/admin'

type Role = 'BUSINESS_OWNER' | 'SALES_DIRECTOR' | 'MARKETING_MANAGER'

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
  { value: 'SALES_DIRECTOR', label: 'Sales Director' },
  { value: 'MARKETING_MANAGER', label: 'Marketing Manager' },
]

const ROLE_BADGE: Record<Role, string> = {
  BUSINESS_OWNER: 'bg-amber-100 text-amber-800',
  SALES_DIRECTOR: 'bg-red-100 text-red-800',
  MARKETING_MANAGER: 'bg-purple-100 text-purple-800',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

function Alert({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null
  return (
    <p className={`text-sm px-4 py-2 rounded-lg mt-2 ${state.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {state.error ?? state.success}
    </p>
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
          <h2 className="font-semibold text-slate-800">All Users</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage roles, passwords, and access</p>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {open ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {open && (
        <form action={async (fd) => { await action(fd); if (!state?.error) setOpen(false) }} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4">
          <h3 className="font-semibold text-slate-700 mb-4">Create New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                name="role"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={pending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {pending ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          <Alert state={state} />
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
      <tr className="border-t border-slate-100 align-top">
        <td className="px-4 py-3 text-slate-500 text-xs">#{user.id}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800 text-sm">{user.email}</div>
          {isSelf && <span className="text-xs text-red-500">(you)</span>}
        </td>
        <td className="px-4 py-3">
          {isSelf ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role]}`}>
              {ROLE_OPTIONS.find(r => r.value === user.role)?.label}
            </span>
          ) : (
            <form action={roleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="role"
                defaultValue={user.role}
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={rolePending}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs px-2 py-1 rounded-lg transition-colors"
              >
                {rolePending ? '…' : 'Save'}
              </button>
            </form>
          )}
          {!isSelf && <Alert state={roleState} />}
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(user.created_at)}</td>
        <td className="px-4 py-3">
          {!isSelf && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowPwForm(v => !v); setShowDelConfirm(false) }}
                className="text-xs text-slate-600 hover:text-red-600 underline underline-offset-2 transition-colors"
              >
                Reset PW
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => { setShowDelConfirm(v => !v); setShowPwForm(false) }}
                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Inline reset password form */}
      {showPwForm && !isSelf && (
        <tr className="border-t-0">
          <td colSpan={5} className="px-4 pb-3">
            <form action={async (fd) => { await pwAction(fd); setShowPwForm(false) }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New Password for {user.email}</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={pwPending}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {pwPending ? 'Saving…' : 'Set Password'}
              </button>
              <button type="button" onClick={() => setShowPwForm(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <Alert state={pwState} />
            </form>
          </td>
        </tr>
      )}

      {/* Inline delete confirmation */}
      {showDelConfirm && !isSelf && (
        <tr className="border-t-0">
          <td colSpan={5} className="px-4 pb-3">
            <form action={async (fd) => { await delAction(fd); setShowDelConfirm(false) }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-sm text-red-700">
                Are you sure you want to delete <strong>{user.email}</strong>? This cannot be undone.
              </p>
              <button
                type="submit"
                disabled={delPending}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {delPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button type="button" onClick={() => setShowDelConfirm(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <Alert state={delState} />
            </form>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function UserManagement({ users, currentUserId }: Props) {
  return (
    <div>
      <CreateUserForm />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">ID</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <UserRow key={user.id} user={user} currentUserId={currentUserId} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
