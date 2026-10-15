import { describe, expect, it } from 'vitest'
import {
  auditFilterProblem,
  auditFiltersSearch,
  auditListQuery,
  auditWindow,
  EMPTY_AUDIT_FILTERS,
  metadataEntries,
  parseAuditFilters,
} from '@/features/audit/lib/audit-filters'

const UUID = '0192a7c2-3b4d-7e5f-8a9b-0c1d2e3f4a5b'

describe('audit filters in the URL', () => {
  it('parses known values and drops the rest', () => {
    const f = parseAuditFilters(new URLSearchParams(`action=USER_LOCKED&resourceType=WAT&resourceId=${UUID}&actor=@minh&from=2026-10-01&to=bad`))
    expect(f).toEqual({ action: 'USER_LOCKED', resourceType: 'ALL', resourceId: UUID, actor: '@minh', from: '2026-10-01', to: '' })
    expect(auditFiltersSearch(f)).toBe(`?action=USER_LOCKED&resourceId=${UUID}&actor=%40minh&from=2026-10-01`)
    expect(auditFiltersSearch(EMPTY_AUDIT_FILTERS)).toBe('')
  })
})

describe('auditWindow', () => {
  it('covers whole local days: from inclusive, to exclusive at the next midnight', () => {
    const w = auditWindow('2026-10-15', '2026-10-15')
    expect(new Date(w.from!).getTime()).toBe(new Date(2026, 9, 15).getTime())
    expect(new Date(w.to!).getTime()).toBe(new Date(2026, 9, 16).getTime())
    expect(auditWindow('', '')).toEqual({})
    expect(new Date(auditWindow('', '2026-10-31').to!).getTime()).toBe(new Date(2026, 10, 1).getTime())
  })
})

describe('auditFilterProblem', () => {
  it('rejects a non-UUID resource id and a reversed range', () => {
    expect(auditFilterProblem({ ...EMPTY_AUDIT_FILTERS, resourceId: 'abc' })).toBe('resourceId')
    expect(auditFilterProblem({ ...EMPTY_AUDIT_FILTERS, from: '2026-10-16', to: '2026-10-15' })).toBe('range')
    expect(auditFilterProblem({ ...EMPTY_AUDIT_FILTERS, resourceId: UUID, from: '2026-10-15', to: '2026-10-15' })).toBeNull()
  })
})

describe('auditListQuery', () => {
  it('sends the resolved actor id and only the set filters', () => {
    const q = auditListQuery({ ...EMPTY_AUDIT_FILTERS, action: 'CHAT_BAN', resourceType: 'USER', actor: '@minh' }, UUID, 'next', 50)
    expect(Object.fromEntries(q)).toEqual({ limit: '50', actorId: UUID, action: 'CHAT_BAN', resourceType: 'USER', cursor: 'next' })
    expect(auditListQuery(EMPTY_AUDIT_FILTERS, null, null, 10).toString()).toBe('limit=10')
  })
})

describe('metadataEntries', () => {
  it('skips columns already shown and stringifies values', () => {
    expect(metadataEntries({ actorRole: 'ADMIN', reason: 'x', requestId: 'r', messageBody: 'hi', expiresAt: null, before: { slowSec: 0 } })).toEqual([
      ['messageBody', 'hi'],
      ['before', '{"slowSec":0}'],
    ])
    expect(metadataEntries(null)).toEqual([])
  })
})
