import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { SETTLE_DELAYS_MS } from '@/lib/poll'

/**
 * Admin actions answer 202 before identity / channel / stream apply them, so the new state shows up a moment later:
 * reload the affected queries now and again after the usual settle delays.
 */
export function useSettle() {
  const queryClient = useQueryClient()
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return useCallback(
    (keys: QueryKey[]) => {
      const refresh = () => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
      refresh()
      for (const delay of SETTLE_DELAYS_MS) timers.current.push(setTimeout(refresh, delay))
    },
    [queryClient],
  )
}
