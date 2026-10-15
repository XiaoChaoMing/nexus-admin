import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '@/lib/poll'
import { streamsApi } from '@/features/streams/api/streams-api'

export const streamKeys = {
  all: ['admin', 'streams'] as const,
  live: () => [...streamKeys.all, 'live'] as const,
  categories: ['categories'] as const,
}

export function useLiveStreams() {
  return useInfiniteQuery({
    queryKey: streamKeys.live(),
    queryFn: ({ pageParam, signal }) => streamsApi.live(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

/** Category id → name; categories rarely change, an unknown id just shows nothing. */
export function useCategoryNames() {
  const { data } = useQuery({ queryKey: streamKeys.categories, queryFn: ({ signal }) => streamsApi.categories(signal), staleTime: 10 * 60_000 })

  return new Map((data?.items ?? []).map((c) => [c.id, c.name]))
}

/** Current time, refreshed every `intervalMs` (elapsed time of live broadcasts). */
export function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
