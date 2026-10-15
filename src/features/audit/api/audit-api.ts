import { apiRequest } from '@/lib/api-client'
import { isUuid } from '@/lib/ids'
import { usersApi } from '@/features/users/api/users-api'
import { auditListQuery } from '@/features/audit/lib/audit-filters'
import type { AuditFilters, AuditPage } from '@/features/audit/types'

export const AUDIT_PAGE_SIZE = 50

export type AuditResult = AuditPage & { actorNotFound?: boolean }

/** `@minh` / `minh` → the id of that exact username (the lookup matches prefixes, so compare the whole name). */
async function resolveActor(actor: string, signal?: AbortSignal): Promise<string | null> {
  if (!actor) return null
  if (isUuid(actor)) return actor
  const username = actor.replace(/^@/, '').toLowerCase()
  const page = await usersApi.search(username, 'ALL', null, signal, 100)

  return page.items.find((u) => u.username.toLowerCase() === username)?.id ?? null
}

export const auditApi = {
  list: async (filters: AuditFilters, cursor: string | null, signal?: AbortSignal, limit = AUDIT_PAGE_SIZE): Promise<AuditResult> => {
    const actorId = await resolveActor(filters.actor, signal)
    if (filters.actor && !actorId) return { items: [], nextCursor: null, actorNotFound: true }

    return apiRequest<AuditPage>(`/v1/admin/audit-log?${auditListQuery(filters, actorId, cursor, limit)}`, { auth: true, signal })
  },
}
