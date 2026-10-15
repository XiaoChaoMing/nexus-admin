import { isApiError } from '@/lib/api-error'
import { describeError, type ErrorMessage } from '@/lib/error-message'

export type AdminOperation =
  | 'lockUser'
  | 'unlockUser'
  | 'suspendChannel'
  | 'restoreChannel'
  | 'takedownStream'
  | 'deleteMessage'
  | 'timeout'
  | 'ban'
  | 'claim'
  | 'resolve'

export type ActionErrorMessage = ErrorMessage & {
  /** Shown under the reason field: the dialog stays open so the admin can fix it. */
  field: boolean
  /** The data on screen is outdated (closed report, ended stream, deleted target): reload it. */
  stale: boolean
}

const REASON_FIELDS = ['reason', 'note']

/**
 * Error codes of the admin endpoints (TSD GĐ5 §5.4, §7) → message keys. Validation of the reason stays in the dialog;
 * conflicts and missing targets close it and reload; everything else falls back to the generic mapping.
 */
export function describeActionError(err: unknown, op: AdminOperation): ActionErrorMessage {
  const generic = (message: ErrorMessage, field = false, stale = false): ActionErrorMessage => ({ ...message, field, stale })

  if (!isApiError(err)) return generic(describeError(err))
  const details = err.details

  if (err.code === 'VALIDATION_FAILED') {
    if (REASON_FIELDS.some((f) => details[f] === 'LENGTH')) return generic({ key: 'common:reason.length' }, true)
    if (details.userId === 'INVALID') return generic({ key: 'common:adminErrors.self' })
    if (details.reportId === 'INVALID') return generic({ key: 'common:adminErrors.reportGone' }, false, true)
    return generic({ key: 'common:errors.VALIDATION_FAILED' }, true)
  }

  if (err.code === 'FORBIDDEN' && err.status === 403) {
    if (op === 'lockUser') return generic({ key: 'common:adminErrors.adminTarget' })
    if (details.target === 'PROTECTED') return generic({ key: 'common:adminErrors.protected' })
  }

  if (err.status === 404) return generic({ key: 'common:adminErrors.notFound' }, false, true)

  if (err.code === 'INVALID_STATE' || err.status === 409) {
    switch (op) {
      case 'claim':
      case 'resolve':
        return generic({ key: 'reports:errors.alreadyClosed' }, false, true)
      case 'takedownStream':
        return generic({ key: 'streams:errors.cannotTakedown' }, false, true)
      case 'timeout':
        return generic({ key: 'common:adminErrors.alreadyBanned' }, false, true)
      default:
        return generic({ key: 'common:errors.INVALID_STATE' }, false, true)
    }
  }

  return generic(describeError(err))
}
