import { ApiError, codeForStatus, NETWORK_ERROR, parseRetryAfter } from '@/lib/api-error'

type AuthHooks = {
  getAccessToken: () => string | null
  /** Returns true when a new access token was obtained. */
  refresh: () => Promise<boolean>
}

let authHooks: AuthHooks = {
  getAccessToken: () => null,
  refresh: async () => false,
}

/** Called once by the session module so the HTTP layer does not depend on it. */
export function configureAuth(hooks: AuthHooks) {
  authHooks = hooks
}

/**
 * CSRF guard of the cookie endpoints (TSD GĐ1 §3 S6): identity rejects `/v1/auth/refresh` and
 * `/v1/auth/logout` without it. The admin console always identifies itself as `admin`.
 */
export const CLIENT_HEADER = { 'X-NXL-Client': 'admin' } as const

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Attach the access token and retry once after a refresh on 401. */
  auth?: boolean
  headers?: Record<string, string>
  signal?: AbortSignal
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const token = opts.auth ? authHooks.getAccessToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      // Same-origin cookie carries the refresh token (HttpOnly, Path=/v1/auth).
      credentials: 'same-origin',
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, NETWORK_ERROR, 'network error')
  }
}

type ErrorEnvelope = { error?: { code?: string; message?: string; details?: Record<string, unknown> } }

/** Turns a non-2xx response into an ApiError; bodies that are not the JSON envelope fall back to the status. */
export async function toApiError(res: Response): Promise<ApiError> {
  const payload = (await res.json().catch(() => null)) as ErrorEnvelope | null
  const error = payload?.error

  return new ApiError(
    res.status,
    error?.code ?? codeForStatus(res.status),
    error?.message ?? res.statusText,
    error?.details ?? {},
    parseRetryAfter(res.headers.get('Retry-After')),
  )
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204 || res.status === 202) return undefined as T

  const payload: unknown = await res.json().catch(() => null)
  return (payload as { data: T } | null)?.data as T
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)

  if (res.status === 401 && opts.auth && (await authHooks.refresh())) {
    res = await send(path, opts)
  }

  return parse<T>(res)
}
