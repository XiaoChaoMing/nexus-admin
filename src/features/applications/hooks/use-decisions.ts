import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { isApiError } from '@/lib/api-error'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { useApprove, useRefreshApplications, useReject } from '@/features/applications/hooks/use-applications'
import type { AdminApplication } from '@/features/applications/types'

export type DialogKind = 'approve' | 'reject' | null

/**
 * Approve / reject with the error rules of the admin screen:
 * 409 INVALID_STATE → reload + "Đơn đã được xử lý"; 403 FORBIDDEN → self-review toast (BR-D24);
 * 404 → reload; 400 on reject stays in the dialog; anything else (429, 503…) → generic toast.
 */
export function useDecisions(app: AdminApplication | undefined) {
  const { t } = useTranslation('applications')
  const errorMessage = useErrorMessage()
  const approve = useApprove()
  const reject = useReject()
  const refresh = useRefreshApplications()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)

  const handleError = (err: unknown, id: string) => {
    if (isApiError(err)) {
      if (err.code === 'INVALID_STATE' || err.status === 409) {
        setDialog(null)
        void refresh(id)
        toast.error(t('errors.alreadyDecided'))
        return
      }
      if (err.code === 'FORBIDDEN' && err.status === 403) {
        setDialog(null)
        toast.error(t('errors.selfReview'))
        return
      }
      if (err.status === 404) {
        setDialog(null)
        void refresh(id)
        toast.error(t('errors.notFound'))
        return
      }
      if (err.code === 'VALIDATION_FAILED' && dialog === 'reject') {
        setRejectError(errorMessage(err))
        return
      }
    }
    setDialog(null)
    toast.error(errorMessage(err))
  }

  const open = (kind: DialogKind) => {
    setRejectError(null)
    setDialog(kind)
  }

  const confirmApprove = () => {
    if (!app) return
    approve.mutate(app.id, {
      onSuccess: (updated) => {
        setDialog(null)
        toast.success(t('approve.success', { username: updated.user.username }))
      },
      onError: (err) => handleError(err, app.id),
    })
  }

  const confirmReject = (reason: string) => {
    if (!app) return
    setRejectError(null)
    reject.mutate(
      { id: app.id, reason },
      {
        onSuccess: (updated) => {
          setDialog(null)
          toast.success(t('reject.success', { username: updated.user.username }))
        },
        onError: (err) => handleError(err, app.id),
      },
    )
  }

  return {
    dialog,
    open,
    close: () => setDialog(null),
    confirmApprove,
    confirmReject,
    approving: approve.isPending,
    rejecting: reject.isPending,
    rejectError,
  }
}
