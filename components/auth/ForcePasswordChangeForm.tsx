'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { changePasswordAction } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

interface ForcePasswordChangeFormProps {
  dashboardPath: string
}

// SR-A8 — an admin-issued temporary password must be changed before any
// other dashboard route is reachable (see middleware.ts's
// FORCE_PASSWORD_CHANGE_PATH redirect). Reuses changePasswordAction, which
// already clears must_change_password on success.
export function ForcePasswordChangeForm({ dashboardPath }: ForcePasswordChangeFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(changePasswordAction, null)

  useEffect(() => {
    if (state?.success) {
      router.replace(dashboardPath)
      router.refresh()
    }
  }, [state?.success, dashboardPath, router])

  return (
    <form action={formAction} className="mt-6">
      <FieldGroup>
        {state?.error && (
          <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        <Field>
          <FieldLabel htmlFor="current_password">Temporary password</FieldLabel>
          <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="new_password">New password</FieldLabel>
          <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={12} placeholder="Min. 12 characters" />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm_password">Confirm new password</FieldLabel>
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Updating…' : 'Set new password'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
