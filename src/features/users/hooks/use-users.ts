import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '@/lib/poll'
import { usersApi } from '@/features/users/api/users-api'
import type { UserStatus } from '@/features/users/types'

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: (q: string, status: UserStatus | 'ALL') => [...userKeys.all, 'list', q, status] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export function useUserSearch(q: string, status: UserStatus | 'ALL') {
  return useInfiniteQuery({
    queryKey: userKeys.list(q, status),
    queryFn: ({ pageParam, signal }) => usersApi.search(q, status, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: ({ signal }) => usersApi.get(id!, signal),
    enabled: Boolean(id),
    refetchInterval: POLL_INTERVAL_MS,
  })
}
