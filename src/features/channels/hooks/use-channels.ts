import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '@/lib/poll'
import { channelsApi } from '@/features/channels/api/channels-api'
import type { ChannelStatus } from '@/features/channels/types'

export const channelKeys = {
  all: ['admin', 'channels'] as const,
  list: (q: string, status: ChannelStatus | 'ALL') => [...channelKeys.all, 'list', q, status] as const,
  detail: (id: string) => [...channelKeys.all, 'detail', id] as const,
}

export function useChannelSearch(q: string, status: ChannelStatus | 'ALL') {
  return useInfiniteQuery({
    queryKey: channelKeys.list(q, status),
    queryFn: ({ pageParam, signal }) => channelsApi.search(q, status, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useAdminChannel(id: string | undefined) {
  return useQuery({
    queryKey: channelKeys.detail(id ?? ''),
    queryFn: ({ signal }) => channelsApi.get(id!, signal),
    enabled: Boolean(id),
    refetchInterval: POLL_INTERVAL_MS,
  })
}
