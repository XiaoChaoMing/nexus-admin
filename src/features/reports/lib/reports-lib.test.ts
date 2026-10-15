import { describe, expect, it, vi } from 'vitest'
import { hasActiveFilters, parseReportFilters, reportFiltersSearch, reportListQuery } from '@/features/reports/lib/filters'
import { authorFromLabel, lockDurationOf } from '@/features/reports/lib/labels'
import { availableActions, otherOpenReports, resolveWithAction, ResolutionError, targetUserId, type ResolutionApi } from '@/features/reports/lib/resolution'
import type { AdminReportDetail } from '@/features/reports/types'
import { ApiError } from '@/lib/api-error'

function report(overrides: Partial<AdminReportDetail> = {}): AdminReportDetail {
  return {
    id: 'r1',
    targetType: 'MESSAGE',
    target: { id: 'm1', label: '@an: spam spam', link: '/live/s1', userId: 'u-an' },
    reason: 'SPAM',
    reporter: { id: 'u-linh', username: 'linh' },
    status: 'OPEN',
    assignedTo: null,
    sameTargetCount: 3,
    createdAt: '2026-10-15T13:14:05Z',
    note: null,
    streamId: 's1',
    channelId: null,
    evidence: [],
    evidenceStatus: 'CAPTURED',
    resolvedBy: null,
    resolvedAt: null,
    resolutionNote: null,
    relatedReports: [],
    actions: [],
    ...overrides,
  }
}

function fakeApi(): ResolutionApi & { calls: string[] } {
  const calls: string[] = []
  const accepted = { actionId: 'a1' }
  return {
    calls,
    stream: vi.fn(async (id: string) => {
      calls.push(`stream ${id}`)
      return { id, channelId: 'c1', title: 'Live', status: 'LIVE' }
    }),
    lockUser: vi.fn(async (id, body) => {
      calls.push(`lock ${id} ${body.durationHours} ${body.reportId}`)
      return accepted
    }),
    suspendChannel: vi.fn(async (id, body) => {
      calls.push(`suspend ${id} ${body.reportId}`)
      return accepted
    }),
    takedownStream: vi.fn(async (id, body) => {
      calls.push(`takedown ${id} ${body.reportId}`)
      return accepted
    }),
    deleteMessage: vi.fn(async (s, m) => calls.push(`delete ${s} ${m}`)),
    timeout: vi.fn(async (c, u, d) => calls.push(`timeout ${c} ${u} ${d}`)),
    ban: vi.fn(async (c, u) => calls.push(`ban ${c} ${u}`)),
    resolve: vi.fn(async (id, body) => {
      calls.push(`resolve ${id} ${body.status} ${body.applyToSameTarget}`)
      return { report: { ...report(), status: body.status }, closedCount: body.applyToSameTarget ? 3 : 1 }
    }),
  }
}

describe('report filters', () => {
  it('round-trips through the URL and drops defaults', () => {
    const filters = parseReportFilters(new URLSearchParams('tab=RESOLVED&targetType=STREAM&reason=SPAM'))
    expect(filters).toEqual({ tab: 'RESOLVED', targetType: 'STREAM', reason: 'SPAM' })
    expect(reportFiltersSearch(filters)).toBe('?tab=RESOLVED&targetType=STREAM&reason=SPAM')
    expect(reportFiltersSearch(parseReportFilters(new URLSearchParams('tab=nope&reason=???')))).toBe('')
    expect(hasActiveFilters(parseReportFilters(new URLSearchParams('tab=ALL')))).toBe(false)
  })

  it('builds the status CSV and optional filters of the API query', () => {
    const todo = reportListQuery({ tab: 'TODO', targetType: 'ALL', reason: 'ALL' }, null, 20)
    expect(todo.get('status')).toBe('OPEN,IN_REVIEW')
    expect(todo.has('targetType')).toBe(false)
    const all = reportListQuery({ tab: 'ALL', targetType: 'MESSAGE', reason: 'OTHER' }, 'cur', 20)
    expect(all.toString()).toBe('status=OPEN%2CIN_REVIEW%2CRESOLVED%2CDISMISSED&limit=20&targetType=MESSAGE&reason=OTHER&cursor=cur')
  })
})

describe('report labels', () => {
  it('reads the author from the target label', () => {
    expect(authorFromLabel(report())).toBe('@an')
    expect(authorFromLabel(report({ targetType: 'USER', target: { id: 'u', label: '@an', link: null, userId: 'u' } }))).toBe('@an')
    expect(authorFromLabel(report({ target: { id: 'm', label: '@?', link: null, userId: null } }))).toBeNull()
    expect(authorFromLabel(report({ targetType: 'CHANNEL', target: { id: 'c', label: 'Kaelen', link: '/kaelen', userId: 'o' } }))).toBeNull()
  })

  it('maps lock windows to the offered durations', () => {
    const at = '2026-10-15T00:00:00Z'
    expect(lockDurationOf({ createdAt: at, expiresAt: null })).toBeNull()
    expect(lockDurationOf({ createdAt: at, expiresAt: '2026-10-16T00:00:00.400Z' })).toBe(24)
    expect(lockDurationOf({ createdAt: at, expiresAt: '2026-10-22T00:00:00Z' })).toBe(168)
    expect(lockDurationOf({ createdAt: at, expiresAt: '2026-11-14T00:00:00Z' })).toBe(720)
    expect(lockDurationOf({ createdAt: at, expiresAt: '2026-10-15T02:00:00Z' })).toBe('OTHER')
  })
})

describe('available actions', () => {
  it('fit the target type and what the report knows', () => {
    expect(availableActions(report())).toEqual(['NONE', 'DELETE_MESSAGE', 'TIMEOUT', 'BAN', 'LOCK_USER'])
    expect(availableActions(report({ streamId: null }))).toEqual(['NONE', 'LOCK_USER'])
    expect(availableActions(report({ targetType: 'USER', target: { id: 'u', label: '@an', link: null, userId: null }, streamId: null }))).toEqual([
      'NONE',
      'LOCK_USER',
    ])
    expect(availableActions(report({ targetType: 'STREAM', target: { id: 's1', label: 'Live', link: '/live/s1', userId: 'o' } }))).toEqual([
      'NONE',
      'TAKEDOWN_STREAM',
      'SUSPEND_CHANNEL',
    ])
    expect(availableActions(report({ targetType: 'CHANNEL' }))).toEqual(['NONE', 'SUSPEND_CHANNEL'])
    expect(availableActions(report({ status: 'RESOLVED' }))).toEqual([])
  })

  it('counts the other open reports and the target user', () => {
    expect(otherOpenReports(report())).toBe(2)
    expect(otherOpenReports(report({ status: 'RESOLVED', sameTargetCount: 2 }))).toBe(2)
    expect(otherOpenReports(report({ sameTargetCount: 1 }))).toBe(0)
    expect(targetUserId(report({ targetType: 'USER', target: { id: 'u9', label: '@x', link: null, userId: null } }))).toBe('u9')
  })
})

describe('resolveWithAction', () => {
  const input = { reason: 'Spam lặp lại nhiều lần', applyToSameTarget: true }

  it('locks the author with the report id, then resolves', async () => {
    const api = fakeApi()
    const out = await resolveWithAction(report(), { action: 'LOCK_USER', durationHours: 168 }, input, api)
    expect(api.calls).toEqual(['lock u-an 168 r1', 'resolve r1 RESOLVED true'])
    expect(out.closedCount).toBe(3)
    expect(api.resolve).toHaveBeenCalledWith('r1', { status: 'RESOLVED', note: input.reason, applyToSameTarget: true })
  })

  it('finds the channel of the room for chat actions and of the stream for a suspension', async () => {
    const api = fakeApi()
    await resolveWithAction(report(), { action: 'TIMEOUT', durationSec: 600 }, input, api)
    await resolveWithAction(report(), { action: 'DELETE_MESSAGE' }, input, api)
    await resolveWithAction(
      report({ targetType: 'STREAM', target: { id: 's7', label: 'Live', link: null, userId: 'o' } }),
      { action: 'SUSPEND_CHANNEL' },
      input,
      api,
    )
    await resolveWithAction(report({ targetType: 'CHANNEL', target: { id: 'c9', label: 'K', link: null, userId: 'o' } }), { action: 'SUSPEND_CHANNEL' }, input, api)
    expect(api.calls.filter((c) => !c.startsWith('resolve'))).toEqual([
      'stream s1',
      'timeout c1 u-an 600',
      'delete s1 m1',
      'stream s7',
      'suspend c1 r1',
      'suspend c9 r1',
    ])
  })

  it('uses the channel the server resolved without looking the stream up', async () => {
    const api = fakeApi()
    await resolveWithAction(report({ channelId: 'c5' }), { action: 'BAN' }, input, api)
    expect(api.calls.filter((c) => !c.startsWith('resolve'))).toEqual(['ban c5 u-an'])
  })

  it('leaves the report open when the action fails, and says so when only the resolve fails', async () => {
    const api = fakeApi()
    api.takedownStream = vi.fn(async () => {
      throw new ApiError(409, 'INVALID_STATE', '')
    })
    const stream = report({ targetType: 'STREAM', target: { id: 's7', label: 'Live', link: null, userId: 'o' } })
    const failed = await resolveWithAction(stream, { action: 'TAKEDOWN_STREAM' }, input, api).catch((e: unknown) => e)
    expect(failed).toBeInstanceOf(ResolutionError)
    expect(failed).toMatchObject({ stage: 'action', op: 'takedownStream' })
    expect(api.resolve).not.toHaveBeenCalled()

    api.resolve = vi.fn(async () => {
      throw new ApiError(409, 'INVALID_STATE', '')
    })
    const late = await resolveWithAction(report(), { action: 'BAN' }, input, api).catch((e: unknown) => e)
    expect(late).toMatchObject({ stage: 'resolve', op: 'resolve' })
    expect(api.calls).toContain('ban c1 u-an')
  })

  it('resolves without an action', async () => {
    const api = fakeApi()
    await resolveWithAction(report(), { action: 'NONE' }, { ...input, applyToSameTarget: false }, api)
    expect(api.calls).toEqual(['resolve r1 RESOLVED false'])
  })
})
