import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminActionsApi } from '@/features/admin-actions/api/admin-actions-api'
import { useActionError } from '@/features/admin-actions/hooks/use-action-error'
import { useSettle } from '@/features/admin-actions/hooks/use-settle'
import { channelKeys } from '@/features/channels/hooks/use-channels'
import type { AdminChannel } from '@/features/channels/types'

export type ChannelDialog = 'suspend' | 'restore' | null

/** Suspend / restore (202; channel-svc applies, stream-svc ends the broadcast, chat goes read-only). */
export function useChannelActions(channel: AdminChannel | undefined, onApplied: () => void) {
  const { t } = useTranslation('channels')
  const describe = useActionError()
  const settle = useSettle()
  const [dialog, setDialog] = useState<ChannelDialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const affected = () => settle([channelKeys.all, ['admin', 'streams'], ['admin', 'audit'], ['admin', 'reports']])

  const succeed = (key: 'suspend.success' | 'restore.success') => () => {
    setDialog(null)
    onApplied()
    affected()
    toast.success(t(key, { name: channel?.displayName }))
  }

  const fail = (op: 'suspendChannel' | 'restoreChannel') => (err: unknown) => {
    const { text, field, stale } = describe(err, op)
    if (field) return setDialogError(text)
    setDialog(null)
    if (stale) affected()
    toast.error(text)
  }

  const suspend = useMutation({
    mutationFn: (reason: string) => adminActionsApi.suspendChannel(channel!.id, { reason }),
    onSuccess: succeed('suspend.success'),
    onError: fail('suspendChannel'),
  })

  const restore = useMutation({
    mutationFn: (reason: string) => adminActionsApi.restoreChannel(channel!.id, reason),
    onSuccess: succeed('restore.success'),
    onError: fail('restoreChannel'),
  })

  return {
    dialog,
    open: (kind: ChannelDialog) => {
      setDialogError(null)
      setDialog(kind)
    },
    close: () => setDialog(null),
    dialogError,
    suspend: (reason: string) => {
      setDialogError(null)
      suspend.mutate(reason)
    },
    suspending: suspend.isPending,
    restore: (reason: string) => {
      setDialogError(null)
      restore.mutate(reason)
    },
    restoring: restore.isPending,
  }
}
