import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '@/lib/poll'
import { reportsApi } from '@/features/reports/api/reports-api'
import type { ReportFilters } from '@/features/reports/types'

export const reportKeys = {
  all: ['admin', 'reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (filters: ReportFilters) => [...reportKeys.lists(), filters] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
  openCount: () => [...reportKeys.all, 'open-count'] as const,
}

/** The queue changes under the admin's feet (new reports, other admins): poll every 30 s (NF-Q9). */
export function useReportList(filters: ReportFilters) {
  return useInfiniteQuery({
    queryKey: reportKeys.list(filters),
    queryFn: ({ pageParam, signal }) => reportsApi.list(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_INTERVAL_MS,
  })
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(id ?? ''),
    queryFn: ({ signal }) => reportsApi.get(id!, signal),
    enabled: Boolean(id),
    refetchInterval: POLL_INTERVAL_MS,
  })
}

/** Badge beside "Báo cáo" in the sidebar. */
export function useOpenReportCount() {
  return useQuery({
    queryKey: reportKeys.openCount(),
    queryFn: ({ signal }) => reportsApi.openCount(signal),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  })
}
