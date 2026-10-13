/** Error envelope returned by every NexusLive service: `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>
  /** Seconds from the `Retry-After` header (429/503), when present. */
  readonly retryAfter: number | null

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR'

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

/**
 * Code for a response without a JSON envelope (Nginx edge pages, gateway timeouts):
 * the status alone decides so callers can still branch on a code.
 */
export function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_FAILED'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 413:
      return 'PAYLOAD_TOO_LARGE'
    case 429:
      return 'RATE_LIMITED'
    case 502:
    case 503:
    case 504:
      return 'SERVICE_UNAVAILABLE'
    default:
      return 'INTERNAL_ERROR'
  }
}

/** Parses `Retry-After` (seconds or HTTP date) into whole seconds. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  const at = Date.parse(trimmed)
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - now) / 1000))
}

/** Seconds to wait before retrying a 429: `details.retryAfterSec` first (NXL-00 §5.1), then the header. */
export function retryAfterSeconds(err: ApiError): number | null {
  const fromDetails = Number(err.details.retryAfterSec)
  if (Number.isFinite(fromDetails) && fromDetails > 0) return Math.ceil(fromDetails)

  return err.retryAfter
}

/** RFC 3339 instant of a temporary lock (`403 ACCOUNT_LOCKED`), or null for a permanent lock. */
export function lockedUntil(err: ApiError): string | null {
  const value = err.details.lockedUntil
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}
