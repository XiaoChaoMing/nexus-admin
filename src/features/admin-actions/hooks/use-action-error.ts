import { useCallback } from 'react'
import { useMessage } from '@/i18n/messages'
import { formatDateTime } from '@/lib/format'
import { describeActionError, type AdminOperation } from '@/features/admin-actions/lib/action-errors'

/** Translated `describeActionError`: `{text, field, stale}` for a dialog or a toast. */
export function useActionError() {
  const msg = useMessage()

  return useCallback(
    (err: unknown, op: AdminOperation) => {
      const described = describeActionError(err, op)
      const values = described.values?.time ? { ...described.values, time: formatDateTime(String(described.values.time)) } : described.values
      return { text: msg(described.key, values) ?? '', field: described.field, stale: described.stale }
    },
    [msg],
  )
}
