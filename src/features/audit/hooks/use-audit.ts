import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS } from '@/lib/poll'
import { auditApi } from '@/features/audit/api/audit-api'
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/lib/audit-filters'
import type { AuditFilters } from '@/features/audit/types'

export const auditKeys = {
  all: ['admin', 'audit'] as const,
  list: (filters: AuditFilters) => [...auditKeys.all, 'list', filters] as const,
  resource: (resourceId: string) => [...auditKeys.all, 'resource', resourceId] as const,
}

/** Newest first; new rows arrive all the time, so the first page is asked again every 30 s. */
export function useAuditLog(filters: AuditFilters, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: auditKeys.list(filters),
    queryFn: ({ pageParam, signal }) => auditApi.list(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_INTERVAL_MS,
    enabled,
  })
}

/** "Lịch sử" block of a user or channel: the 10 newest rows about that resource. */
export function useResourceHistory(resourceId: string | undefined) {
  return useQuery({
    queryKey: auditKeys.resource(resourceId ?? ''),
    queryFn: ({ signal }) => auditApi.list({ ...EMPTY_AUDIT_FILTERS, resourceId: resourceId! }, null, signal, 10),
    enabled: Boolean(resourceId),
    refetchInterval: POLL_INTERVAL_MS,
  })
}
