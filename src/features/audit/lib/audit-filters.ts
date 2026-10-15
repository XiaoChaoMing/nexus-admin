import { isUuid } from '@/lib/ids'
import { AUDIT_ACTIONS, RESOURCE_TYPES, type AuditAction, type AuditFilters, type ResourceType } from '@/features/audit/types'

export const EMPTY_AUDIT_FILTERS: AuditFilters = { action: 'ALL', resourceType: 'ALL', resourceId: '', actor: '', from: '', to: '' }

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

const pick = <V extends string>(values: readonly V[], raw: string | null): V | 'ALL' => (values.includes(raw as V) ? (raw as V) : 'ALL')

export function parseAuditFilters(params: URLSearchParams): AuditFilters {
  const day = (key: string) => (DAY.test(params.get(key) ?? '') ? params.get(key)! : '')

  return {
    action: pick<AuditAction>(AUDIT_ACTIONS, params.get('action')),
    resourceType: pick<ResourceType>(RESOURCE_TYPES, params.get('resourceType')),
    resourceId: params.get('resourceId')?.trim() ?? '',
    actor: params.get('actor')?.trim() ?? '',
    from: day('from'),
    to: day('to'),
  }
}

export function auditFiltersSearch(filters: AuditFilters): string {
  const params = new URLSearchParams()
  if (filters.action !== 'ALL') params.set('action', filters.action)
  if (filters.resourceType !== 'ALL') params.set('resourceType', filters.resourceType)
  if (filters.resourceId) params.set('resourceId', filters.resourceId)
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const search = params.toString()

  return search ? `?${search}` : ''
}

export function hasAuditFilters(filters: AuditFilters): boolean {
  return auditFiltersSearch(filters) !== ''
}

/** Local midnight of a `YYYY-MM-DD` day, plus `addDays`. */
function localMidnight(day: string, addDays = 0): Date | null {
  const m = DAY.exec(day)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + addDays)

  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Calendar days in the admin's time zone → the API window: `from` inclusive at local midnight, `to` exclusive at the
 * midnight after the chosen day (so "15/10 – 15/10" covers the whole 15th).
 */
export function auditWindow(from: string, to: string): { from?: string; to?: string } {
  const start = from ? localMidnight(from) : null
  const end = to ? localMidnight(to, 1) : null

  return { ...(start && { from: start.toISOString() }), ...(end && { to: end.toISOString() }) }
}

export type AuditFilterProblem = 'resourceId' | 'range' | null

/** Client-side checks before asking the server (resourceId is a UUID, the range is not reversed). */
export function auditFilterProblem(filters: AuditFilters): AuditFilterProblem {
  if (filters.resourceId && !isUuid(filters.resourceId)) return 'resourceId'
  if (filters.from && filters.to && filters.from > filters.to) return 'range'

  return null
}

/** `GET /v1/admin/audit-log` query once the actor is resolved to an id. */
export function auditListQuery(filters: AuditFilters, actorId: string | null, cursor: string | null, limit: number): URLSearchParams {
  const query = new URLSearchParams({ limit: String(limit) })
  if (actorId) query.set('actorId', actorId)
  if (filters.action !== 'ALL') query.set('action', filters.action)
  if (filters.resourceType !== 'ALL') query.set('resourceType', filters.resourceType)
  if (filters.resourceId) query.set('resourceId', filters.resourceId)
  const window = auditWindow(filters.from, filters.to)
  if (window.from) query.set('from', window.from)
  if (window.to) query.set('to', window.to)
  if (cursor) query.set('cursor', cursor)

  return query
}

/** Metadata worth showing in the expanded row (actorRole / reason are columns; requestId is noise). */
export function metadataEntries(metadata: Record<string, unknown> | null): [string, string][] {
  if (!metadata) return []
  const skip = new Set(['actorRole', 'reason', 'requestId'])

  return Object.entries(metadata)
    .filter(([key, value]) => !skip.has(key) && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
}
