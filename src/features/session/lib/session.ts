import { configureAuth } from '@/lib/api-client'
import { ApiError, isApiError } from '@/lib/api-error'
import { sessionApi, type LoginBody } from '@/features/session/api/session-api'
import { useSessionStore } from '@/features/session/session-store'

type RefreshResult = 'ok' | 'anonymous' | ApiError

let inflight: Promise<RefreshResult> | null = null

/** 4xx from refresh means the cookie is gone, expired, reused or the account is locked: sign in again. */
function endsSession(err: unknown) {
  return isApiError(err) && err.status >= 400 && err.status < 500 && err.status !== 429
}

/** Rotates the refresh cookie for a new access token; concurrent callers share one request. */
function rotate(): Promise<RefreshResult> {
  inflight ??= sessionApi
    .refresh()
    .then((session): RefreshResult => {
      useSessionStore.getState().setToken(session.accessToken)
      return 'ok'
    })
    .catch((err: unknown): RefreshResult => {
      if (endsSession(err)) {
        useSessionStore.getState().clear()
        return 'anonymous'
      }
      return isApiError(err) ? err : new ApiError(0, 'INTERNAL_ERROR', String(err))
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

/** Used by the HTTP layer on 401: true when the request can be retried with a new token. */
export async function refreshSession(): Promise<boolean> {
  return (await rotate()) === 'ok'
}

/** Loads `/v1/me` (roles decide the admin gate); a 401 here ends the session. */
export async function loadProfile(): Promise<void> {
  try {
    useSessionStore.getState().setMe(await sessionApi.me())
  } catch (err) {
    if (isApiError(err) && err.status === 401) {
      useSessionStore.getState().clear()
      return
    }
    throw err
  }
}

/** Boot: refresh cookie → access token → `/v1/me`. Never throws; the outcome lands in the store. */
export async function initSession(): Promise<void> {
  configureAuth({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refresh: refreshSession,
  })

  const result = await rotate()
  if (result === 'anonymous') return
  if (result !== 'ok') {
    useSessionStore.getState().fail(result)
    return
  }

  try {
    await loadProfile()
  } catch (err) {
    useSessionStore.getState().fail(isApiError(err) ? err : new ApiError(0, 'INTERNAL_ERROR', String(err)))
  }
}

/** Password login, then the profile so the gate can tell admins from everyone else. */
export async function login(body: LoginBody): Promise<void> {
  const session = await sessionApi.login(body)
  useSessionStore.getState().setToken(session.accessToken)

  try {
    await loadProfile()
    if (!useSessionStore.getState().me) throw new ApiError(401, 'UNAUTHORIZED', 'profile unavailable')
  } catch (err) {
    // Without roles the gate cannot decide; drop the half-open session and surface the error on the form.
    useSessionStore.getState().clear()
    throw err
  }
}

/** Revokes the refresh session; signs out locally even when the call fails (the cookie expires on its own). */
export async function logout(): Promise<void> {
  try {
    await sessionApi.logout()
  } catch {
    // ignored on purpose
  } finally {
    useSessionStore.getState().clear()
  }
}
