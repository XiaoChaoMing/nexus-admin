import { apiRequest } from '@/lib/api-client'
import type { Category, LiveStreamPage } from '@/features/streams/types'

/** stream-svc caps public lists at 50. */
export const STREAM_PAGE_SIZE = 50

export const streamsApi = {
  /** On air now, most viewers first (G5-Q6: there is no admin list of past broadcasts). */
  live: (cursor: string | null, signal?: AbortSignal) => {
    const query = new URLSearchParams({ status: 'live', limit: String(STREAM_PAGE_SIZE) })
    if (cursor) query.set('cursor', cursor)
    return apiRequest<LiveStreamPage>(`/v1/streams?${query}`, { auth: true, signal })
  },
  categories: (signal?: AbortSignal) => apiRequest<{ items: Category[] }>('/v1/categories', { signal }),
}
