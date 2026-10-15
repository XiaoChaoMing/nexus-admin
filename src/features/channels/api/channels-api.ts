import { apiRequest } from '@/lib/api-client'
import type { AdminChannel, ChannelPage, ChannelStatus } from '@/features/channels/types'

export const CHANNEL_PAGE_SIZE = 20

export const channelsApi = {
  /** `q`: a UUID (exact id), a handle prefix or part of the display name; sorted by handle. */
  search: (q: string, status: ChannelStatus | 'ALL', cursor: string | null, signal?: AbortSignal) => {
    const query = new URLSearchParams({ limit: String(CHANNEL_PAGE_SIZE) })
    if (q) query.set('q', q.replace(/^@/, ''))
    if (status !== 'ALL') query.set('status', status)
    if (cursor) query.set('cursor', cursor)
    return apiRequest<ChannelPage>(`/v1/admin/channels?${query}`, { auth: true, signal })
  },
  get: (id: string, signal?: AbortSignal) => apiRequest<AdminChannel>(`/v1/admin/channels/${encodeURIComponent(id)}`, { auth: true, signal }),
}
