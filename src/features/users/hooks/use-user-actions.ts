import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminActionsApi } from '@/features/admin-actions/api/admin-actions-api'
import { useActionError } from '@/features/admin-actions/hooks/use-action-error'
import { useSettle } from '@/features/admin-actions/hooks/use-settle'
import type { LockDuration } from '@/features/admin-actions/types'
import { userKeys } from '@/features/users/hooks/use-users'
import type { AdminUser } from '@/features/users/types'

export type UserDialog = 'lock' | 'unlock' | null

/** Lock / unlock (202, identity applies it within ~2 s; locking also signs the person out everywhere). */
export function useUserActions(user: AdminUser | undefined, onApplied: () => void) {
  const { t } = useTranslation('users')
  const describe = useActionError()
  const settle = useSettle()
  const [dialog, setDialog] = useState<UserDialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const affected = () => settle([userKeys.all, ['admin', 'audit'], ['admin', 'reports']])

  const fail = (op: 'lockUser' | 'unlockUser') => (err: unknown) => {
    const { text, field, stale } = describe(err, op)
    if (field) return setDialogError(text)
    setDialog(null)
    if (stale) affected()
    toast.error(text)
  }

  const lock = useMutation({
    mutationFn: (vars: { durationHours: LockDuration; reason: string }) => adminActionsApi.lockUser(user!.id, vars),
    onSuccess: () => {
      setDialog(null)
      onApplied()
      affected()
      toast.success(t('lock.success', { username: user?.username }))
    },
    onError: fail('lockUser'),
  })

  const unlock = useMutation({
    mutationFn: (reason: string) => adminActionsApi.unlockUser(user!.id, reason),
    onSuccess: () => {
      setDialog(null)
      onApplied()
      affected()
      toast.success(t('unlock.success', { username: user?.username }))
    },
    onError: fail('unlockUser'),
  })

  return {
    dialog,
    open: (kind: UserDialog) => {
      setDialogError(null)
      setDialog(kind)
    },
    close: () => setDialog(null),
    dialogError,
    lock: (durationHours: LockDuration, reason: string) => {
      setDialogError(null)
      lock.mutate({ durationHours, reason })
    },
    locking: lock.isPending,
    unlock: (reason: string) => {
      setDialogError(null)
      unlock.mutate(reason)
    },
    unlocking: unlock.isPending,
  }
}
