import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminActionsApi } from '@/features/admin-actions/api/admin-actions-api'
import { useActionError } from '@/features/admin-actions/hooks/use-action-error'
import { useSettle } from '@/features/admin-actions/hooks/use-settle'
import { reportsApi } from '@/features/reports/api/reports-api'
import { reportKeys } from '@/features/reports/hooks/use-reports'
import { ResolutionError, resolveWithAction, type ResolutionApi, type ResolutionChoice } from '@/features/reports/lib/resolution'
import type { AdminReportDetail } from '@/features/reports/types'

export type ReportDialog = 'resolve' | 'dismiss' | null

const resolutionApi: ResolutionApi = {
  stream: adminActionsApi.stream,
  lockUser: adminActionsApi.lockUser,
  suspendChannel: adminActionsApi.suspendChannel,
  takedownStream: adminActionsApi.takedownStream,
  deleteMessage: adminActionsApi.deleteMessage,
  timeout: adminActionsApi.timeout,
  ban: adminActionsApi.ban,
  resolve: reportsApi.resolve,
}

/** Keys an admin action can change besides the reports themselves (user, channel and stream pages, audit log). */
const AFFECTED = [reportKeys.all, ['admin', 'users'], ['admin', 'channels'], ['admin', 'streams'], ['admin', 'audit']] as const

/**
 * Claim, resolve (action + close) and dismiss with the screen's error rules: closed by someone else (409) → reload +
 * "Báo cáo đã được xử lý"; reason problems stay in the dialog; an action that applied before the close failed is said so.
 */
export function useReportActions(report: AdminReportDetail | undefined) {
  const { t } = useTranslation('reports')
  const queryClient = useQueryClient()
  const describe = useActionError()
  const settle = useSettle()
  const [dialog, setDialog] = useState<ReportDialog>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const refresh = () => settle([...AFFECTED])

  const claim = useMutation({
    mutationFn: (id: string) => reportsApi.claim(id),
    onSuccess: () => {
      toast.success(t('claim.success'))
      void queryClient.invalidateQueries({ queryKey: reportKeys.all })
    },
    onError: (err) => {
      const { text, stale } = describe(err, 'claim')
      if (stale) void queryClient.invalidateQueries({ queryKey: reportKeys.all })
      toast.error(text)
    },
  })

  const resolve = useMutation({
    mutationFn: (vars: { choice: ResolutionChoice; reason: string; applyToSameTarget: boolean }) =>
      resolveWithAction(report!, vars.choice, { reason: vars.reason, applyToSameTarget: vars.applyToSameTarget }, resolutionApi),
  })

  const dismiss = useMutation({
    mutationFn: (vars: { reason: string; applyToSameTarget: boolean }) =>
      reportsApi.resolve(report!.id, { status: 'DISMISSED', note: vars.reason, applyToSameTarget: vars.applyToSameTarget }),
  })

  const fail = (err: unknown, actionRan = false) => {
    const resolution = err instanceof ResolutionError ? err : null
    const { text, field, stale } = describe(resolution ? resolution.original : err, resolution?.op ?? 'resolve')

    if (field) {
      setDialogError(text)
      return
    }
    setDialog(null)
    refresh()
    if (actionRan && resolution?.stage === 'resolve' && !stale) {
      toast.error(t('errors.actionAppliedNotClosed', { error: text }))
      return
    }
    toast.error(text)
  }

  const open = (kind: ReportDialog) => {
    setDialogError(null)
    setDialog(kind)
  }

  const confirmResolve = (choice: ResolutionChoice, reason: string, applyToSameTarget: boolean) => {
    if (!report) return
    setDialogError(null)
    resolve.mutate(
      { choice, reason, applyToSameTarget },
      {
        onSuccess: ({ closedCount }) => {
          setDialog(null)
          refresh()
          toast.success(closedCount > 1 ? t('resolve.successMany', { count: closedCount }) : t('resolve.success'))
        },
        onError: (err) => fail(err, choice.action !== 'NONE'),
      },
    )
  }

  const confirmDismiss = (reason: string, applyToSameTarget: boolean) => {
    if (!report) return
    setDialogError(null)
    dismiss.mutate(
      { reason, applyToSameTarget },
      {
        onSuccess: ({ closedCount }) => {
          setDialog(null)
          refresh()
          toast.success(closedCount > 1 ? t('dismiss.successMany', { count: closedCount }) : t('dismiss.success'))
        },
        onError: (err) => fail(err),
      },
    )
  }

  return {
    dialog,
    open,
    close: () => setDialog(null),
    dialogError,
    claim: () => report && claim.mutate(report.id),
    claiming: claim.isPending,
    confirmResolve,
    resolving: resolve.isPending,
    confirmDismiss,
    dismissing: dismiss.isPending,
  }
}
