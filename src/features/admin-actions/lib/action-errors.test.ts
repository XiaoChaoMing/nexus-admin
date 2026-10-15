import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api-error'
import { describeActionError } from '@/features/admin-actions/lib/action-errors'

const err = (status: number, code: string, details: Record<string, unknown> = {}) => new ApiError(status, code, '', details)

describe('describeActionError', () => {
  it('keeps reason length errors in the dialog', () => {
    expect(describeActionError(err(400, 'VALIDATION_FAILED', { reason: 'LENGTH' }), 'lockUser')).toEqual({
      key: 'common:reason.length',
      field: true,
      stale: false,
    })
    expect(describeActionError(err(400, 'VALIDATION_FAILED', { note: 'LENGTH' }), 'resolve').key).toBe('common:reason.length')
  })

  it('names self-targeting and admin targets', () => {
    expect(describeActionError(err(400, 'VALIDATION_FAILED', { userId: 'INVALID' }), 'lockUser').key).toBe('common:adminErrors.self')
    expect(describeActionError(err(403, 'FORBIDDEN'), 'lockUser').key).toBe('common:adminErrors.adminTarget')
    expect(describeActionError(err(403, 'FORBIDDEN', { target: 'PROTECTED' }), 'ban').key).toBe('common:adminErrors.protected')
    expect(describeActionError(err(403, 'FORBIDDEN'), 'suspendChannel').key).toBe('common:errors.FORBIDDEN')
  })

  it('marks conflicts and missing targets as stale with an operation-specific message', () => {
    expect(describeActionError(err(409, 'INVALID_STATE'), 'resolve')).toEqual({ key: 'reports:errors.alreadyClosed', field: false, stale: true })
    expect(describeActionError(err(409, 'INVALID_STATE'), 'claim').key).toBe('reports:errors.alreadyClosed')
    expect(describeActionError(err(409, 'INVALID_STATE'), 'takedownStream').key).toBe('streams:errors.cannotTakedown')
    expect(describeActionError(err(409, 'INVALID_STATE'), 'timeout').key).toBe('common:adminErrors.alreadyBanned')
    expect(describeActionError(err(404, 'NOT_FOUND'), 'suspendChannel')).toEqual({ key: 'common:adminErrors.notFound', field: false, stale: true })
  })

  it('falls back to the generic mapping', () => {
    expect(describeActionError(err(429, 'RATE_LIMITED', { retryAfterSec: 5 }), 'lockUser')).toEqual({
      key: 'common:errors.RATE_LIMITED_wait',
      values: { seconds: 5 },
      field: false,
      stale: false,
    })
    expect(describeActionError(err(503, 'SERVICE_UNAVAILABLE'), 'takedownStream').key).toBe('common:errors.SERVICE_UNAVAILABLE')
    expect(describeActionError(new Error('x'), 'ban').key).toBe('common:errors.fallback')
  })
})
