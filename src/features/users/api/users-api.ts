import { apiRequest } from '@/lib/api-client'
import type { AdminUser, UserPage, UserStatus } from '@/features/users/types'

export const USER_PAGE_SIZE = 20

const enc = encodeURIComponent

export const usersApi = {
  /** safety copy: `q` is a UUID (exact id) or a username prefix; sorted by username. */
  search: (q: string, status: UserStatus | 'ALL', cursor: string | null, signal?: AbortSignal, limit = USER_PAGE_SIZE) => {
    const query = new URLSearchParams({ limit: String(limit) })
    if (q) query.set('q', q)
    if (status !== 'ALL') query.set('status', status)
    if (cursor) query.set('cursor', cursor)
    return apiRequest<UserPage>(`/v1/admin/users?${query}`, { auth: true, signal })
  },
  /** identity: e-mail, lock kind and reason. */
  get: (id: string, signal?: AbortSignal) => apiRequest<AdminUser>(`/v1/admin/users/${enc(id)}`, { auth: true, signal }),
}
