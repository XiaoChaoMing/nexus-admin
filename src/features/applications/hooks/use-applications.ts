import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applicationsApi } from '@/features/applications/api/applications-api'
import type { AdminApplication, StatusFilter } from '@/features/applications/types'

export const applicationKeys = {
  all: ['admin', 'creator-applications'] as const,
  list: (status: StatusFilter) => [...applicationKeys.all, 'list', status] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
}

export function useApplicationList(status: StatusFilter) {
  return useInfiniteQuery({
    queryKey: applicationKeys.list(status),
    queryFn: ({ pageParam, signal }) => applicationsApi.list(status, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? ''),
    queryFn: ({ signal }) => applicationsApi.get(id!, signal),
    enabled: Boolean(id),
  })
}

/** After a decision (or a 409 from someone else's decision) every list and the detail are stale. */
export function useRefreshApplications() {
  const queryClient = useQueryClient()

  return (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, 'list'] }),
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) }),
    ])
}

function useDecision<V>(fn: (vars: V) => Promise<AdminApplication>) {
  const queryClient = useQueryClient()
  const refresh = useRefreshApplications()

  return useMutation({
    mutationFn: fn,
    onSuccess: (app) => {
      queryClient.setQueryData(applicationKeys.detail(app.id), app)
      void refresh(app.id)
    },
  })
}

export function useApprove() {
  return useDecision((id: string) => applicationsApi.approve(id))
}

export function useReject() {
  return useDecision(({ id, reason }: { id: string; reason: string }) => applicationsApi.reject(id, reason))
}
