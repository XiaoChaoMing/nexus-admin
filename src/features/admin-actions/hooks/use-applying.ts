import { useEffect, useRef, useState } from 'react'

const MAX_WAIT_MS = 6_000

/**
 * "Đang áp dụng…" after a 202: true from `start()` while the watched state is still the one it had then, until the
 * owning service applies the action (the state changes) or a few seconds pass.
 */
export function useApplying(state: string | undefined) {
  const [from, setFrom] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const start = () => {
    setFrom(state ?? '')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFrom(null), MAX_WAIT_MS)
  }

  return { applying: from !== null && (state ?? '') === from, start }
}
