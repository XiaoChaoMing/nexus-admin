import { isApiError, lockedUntil, NETWORK_ERROR, retryAfterSeconds } from '@/lib/api-error'

/** An i18n key ("ns:path") plus interpolation values; components translate it with useMessage(). */
export type ErrorMessage = { key: string; values?: Record<string, unknown> }

/** Codes with a generic message in common:errors (NXL-00 §5). */
const COMMON_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_STATE',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  NETWORK_ERROR,
] as const

type DescribeOptions = {
  /** Screen-specific keys per error code, checked before the generic ones (e.g. FORBIDDEN on approve). */
  overrides?: Partial<Record<string, string>>
  /** Formats `details.lockedUntil`; injected so the mapping stays testable without a locale. */
  formatTime?: (iso: string) => string
}

/**
 * Maps any thrown value to a message key. 429 carries the wait in seconds, a temporary
 * ACCOUNT_LOCKED carries the unlock time; anything unknown falls back to common:errors.fallback.
 */
export function describeError(err: unknown, { overrides = {}, formatTime = (iso) => iso }: DescribeOptions = {}): ErrorMessage {
  if (!isApiError(err)) return { key: 'common:errors.fallback' }

  const override = overrides[err.code]
  if (override) return { key: override }

  if (err.code === 'RATE_LIMITED' || err.status === 429) {
    const seconds = retryAfterSeconds(err)
    return seconds ? { key: 'common:errors.RATE_LIMITED_wait', values: { seconds } } : { key: 'common:errors.RATE_LIMITED' }
  }

  if (err.code === 'ACCOUNT_LOCKED') {
    const until = lockedUntil(err)
    return until ? { key: 'common:errors.ACCOUNT_LOCKED_until', values: { time: formatTime(until) } } : { key: 'common:errors.ACCOUNT_LOCKED' }
  }

  if ((COMMON_CODES as readonly string[]).includes(err.code)) return { key: `common:errors.${err.code}` }
  if (err.status === 503) return { key: 'common:errors.SERVICE_UNAVAILABLE' }

  return { key: 'common:errors.fallback' }
}
