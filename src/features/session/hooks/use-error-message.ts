import { useCallback } from 'react'
import { useMessage } from '@/i18n/messages'
import { describeError } from '@/lib/error-message'
import { formatDateTime } from '@/lib/format'

/** Translates any thrown value (ApiError or not) for a toast or a form alert. */
export function useErrorMessage() {
  const msg = useMessage()

  return useCallback(
    (err: unknown, overrides?: Partial<Record<string, string>>) => {
      const { key, values } = describeError(err, { overrides, formatTime: (iso) => formatDateTime(iso) })
      return msg(key, values) ?? ''
    },
    [msg],
  )
}
