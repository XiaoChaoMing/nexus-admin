import { describe, expect, it } from 'vitest'
import { toApiError } from '@/lib/api-client'
import { ApiError, codeForStatus, lockedUntil, parseRetryAfter, retryAfterSeconds } from '@/lib/api-error'
import { describeError } from '@/lib/error-message'

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

describe('toApiError', () => {
  it('reads the NXL envelope and Retry-After', async () => {
    const err = await toApiError(
      json(429, { error: { code: 'RATE_LIMITED', message: 'slow down', details: { retryAfterSec: 42 } } }, { 'Retry-After': '60' }),
    )
    expect(err).toMatchObject({ status: 429, code: 'RATE_LIMITED', message: 'slow down', retryAfter: 60 })
    expect(err.details.retryAfterSec).toBe(42)
  })

  it('falls back to the status when the body is not the envelope (Nginx HTML page)', async () => {
    const err = await toApiError(new Response('<html>503</html>', { status: 503, statusText: 'Service Unavailable' }))
    expect(err.code).toBe('SERVICE_UNAVAILABLE')
    expect(err.status).toBe(503)
  })

  it('keeps ACCOUNT_LOCKED details', async () => {
    const err = await toApiError(json(403, { error: { code: 'ACCOUNT_LOCKED', message: 'locked', details: { lockedUntil: '2026-10-13T10:15:00Z' } } }))
    expect(lockedUntil(err)).toBe('2026-10-13T10:15:00Z')
  })
})

describe('codeForStatus', () => {
  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
    [502, 'SERVICE_UNAVAILABLE'],
    [503, 'SERVICE_UNAVAILABLE'],
    [500, 'INTERNAL_ERROR'],
  ])('%i → %s', (status, code) => expect(codeForStatus(status)).toBe(code))
})

describe('retry-after', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('60')).toBe(60)
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
    const now = Date.parse('2026-10-13T10:00:00Z')
    expect(parseRetryAfter('Tue, 13 Oct 2026 10:00:30 GMT', now)).toBe(30)
  })

  it('prefers details.retryAfterSec over the header', () => {
    expect(retryAfterSeconds(new ApiError(429, 'RATE_LIMITED', '', { retryAfterSec: 12.2 }, 60))).toBe(13)
    expect(retryAfterSeconds(new ApiError(429, 'RATE_LIMITED', '', {}, 60))).toBe(60)
    expect(retryAfterSeconds(new ApiError(429, 'RATE_LIMITED', ''))).toBeNull()
  })

  it('ignores a malformed lockedUntil (permanent lock)', () => {
    expect(lockedUntil(new ApiError(403, 'ACCOUNT_LOCKED', '', { lockedUntil: 'never' }))).toBeNull()
    expect(lockedUntil(new ApiError(403, 'ACCOUNT_LOCKED', ''))).toBeNull()
  })
})

describe('describeError', () => {
  it('maps 429 with the wait in seconds', () => {
    expect(describeError(new ApiError(429, 'RATE_LIMITED', '', { retryAfterSec: 30 }))).toEqual({
      key: 'common:errors.RATE_LIMITED_wait',
      values: { seconds: 30 },
    })
    expect(describeError(new ApiError(429, 'RATE_LIMITED', ''))).toEqual({ key: 'common:errors.RATE_LIMITED' })
  })

  it('maps a temporary lock with the formatted unlock time', () => {
    const err = new ApiError(403, 'ACCOUNT_LOCKED', '', { lockedUntil: '2026-10-13T10:15:00Z' })
    expect(describeError(err, { formatTime: (iso) => `at ${iso}` })).toEqual({
      key: 'common:errors.ACCOUNT_LOCKED_until',
      values: { time: 'at 2026-10-13T10:15:00Z' },
    })
    expect(describeError(new ApiError(403, 'ACCOUNT_LOCKED', ''))).toEqual({ key: 'common:errors.ACCOUNT_LOCKED' })
  })

  it('uses screen overrides before the generic message', () => {
    const forbidden = new ApiError(403, 'FORBIDDEN', '')
    expect(describeError(forbidden)).toEqual({ key: 'common:errors.FORBIDDEN' })
    expect(describeError(forbidden, { overrides: { FORBIDDEN: 'applications:errors.selfReview' } })).toEqual({
      key: 'applications:errors.selfReview',
    })
  })

  it('maps 503, network errors, unknown codes and non-API errors', () => {
    expect(describeError(new ApiError(503, 'SERVICE_UNAVAILABLE', ''))).toEqual({ key: 'common:errors.SERVICE_UNAVAILABLE' })
    expect(describeError(new ApiError(503, 'SOMETHING_NEW', ''))).toEqual({ key: 'common:errors.SERVICE_UNAVAILABLE' })
    expect(describeError(new ApiError(0, 'NETWORK_ERROR', ''))).toEqual({ key: 'common:errors.NETWORK_ERROR' })
    expect(describeError(new ApiError(418, 'TEAPOT', ''))).toEqual({ key: 'common:errors.fallback' })
    expect(describeError(new Error('boom'))).toEqual({ key: 'common:errors.fallback' })
  })
})
