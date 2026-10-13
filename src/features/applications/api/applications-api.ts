import { apiRequest } from '@/lib/api-client'
import type { AdminApplication, ApplicationPage, StatusFilter } from '@/features/applications/types'

export const PAGE_SIZE = 20

const BASE = '/v1/admin/creator-applications'

export const applicationsApi = {
  /** Oldest first; `nextCursor` null on the last page. */
  list: (status: StatusFilter, cursor?: string | null, signal?: AbortSignal) => {
    const query = new URLSearchParams({ status, limit: String(PAGE_SIZE) })
    if (cursor) query.set('cursor', cursor)
    return apiRequest<ApplicationPage>(`${BASE}?${query}`, { auth: true, signal })
  },
  get: (id: string, signal?: AbortSignal) => apiRequest<AdminApplication>(`${BASE}/${encodeURIComponent(id)}`, { auth: true, signal }),
  approve: (id: string) => apiRequest<AdminApplication>(`${BASE}/${encodeURIComponent(id)}/approve`, { method: 'POST', auth: true }),
  reject: (id: string, reason: string) =>
    apiRequest<AdminApplication>(`${BASE}/${encodeURIComponent(id)}/reject`, { method: 'POST', auth: true, body: { reason } }),
}
