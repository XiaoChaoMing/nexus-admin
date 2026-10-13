import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '@/lib/api-client'
import { initSession, login, logout } from '@/features/session/lib/session'
import { useSessionStore } from '@/features/session/session-store'
import { meWith } from '@/features/session/test-fixtures'

type Route = (init: RequestInit) => Response | Promise<Response>

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } })
const fail = (status: number, code: string, details: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ error: { code, message: code, details } }), { status, headers: { 'Content-Type': 'application/json' } })
const session = (token: string) => ({ accessToken: token, expiresIn: 900, user: meWith(['VIEWER']).user })

/** Minimal fetch fake: one handler queue per "METHOD path", records every call. */
function fakeFetch(routes: Record<string, Route[]>) {
  const calls: { key: string; init: RequestInit }[] = []
  const fn = vi.fn(async (path: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${path}`
    calls.push({ key, init })
    const queue = routes[key]
    if (!queue?.length) throw new Error(`unexpected ${key}`)
    const handler = queue.length > 1 ? queue.shift()! : queue[0]
    return handler(init)
  })
  vi.stubGlobal('fetch', fn)
  return calls
}

const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name]

beforeEach(() => {
  useSessionStore.setState({ status: 'unknown', accessToken: null, me: null, error: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('initSession', () => {
  it('refreshes with X-NXL-Client: admin, then loads /v1/me with the new token', async () => {
    const calls = fakeFetch({
      'POST /v1/auth/refresh': [() => ok(session('t1'))],
      'GET /v1/me': [() => ok(meWith(['VIEWER', 'ADMIN']))],
    })

    await initSession()

    const refresh = calls.find((c) => c.key === 'POST /v1/auth/refresh')!
    expect(header(refresh.init, 'X-NXL-Client')).toBe('admin')
    expect(refresh.init.credentials).toBe('same-origin')
    expect(header(calls.find((c) => c.key === 'GET /v1/me')!.init, 'Authorization')).toBe('Bearer t1')
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 't1' })
    expect(useSessionStore.getState().me?.roles).toContain('ADMIN')
  })

  it('keeps a non-admin session so the gate can show the no-permission screen', async () => {
    fakeFetch({
      'POST /v1/auth/refresh': [() => ok(session('t1'))],
      'GET /v1/me': [() => ok(meWith(['VIEWER']))],
    })

    await initSession()

    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(useSessionStore.getState().me?.roles).toEqual(['VIEWER'])
  })

  it('becomes anonymous when the refresh cookie is missing or expired', async () => {
    fakeFetch({ 'POST /v1/auth/refresh': [() => fail(401, 'SESSION_EXPIRED')] })

    await initSession()

    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, me: null })
  })

  it('reports an unreachable backend (503) instead of pretending to be signed out', async () => {
    fakeFetch({ 'POST /v1/auth/refresh': [() => new Response('bad gateway', { status: 503 })] })

    await initSession()

    expect(useSessionStore.getState().status).toBe('error')
    expect(useSessionStore.getState().error?.code).toBe('SERVICE_UNAVAILABLE')
  })
})

describe('401 handling', () => {
  it('refreshes once, shares the refresh between concurrent calls and retries', async () => {
    let listCalls = 0
    const calls = fakeFetch({
      'POST /v1/auth/refresh': [() => ok(session('t1')), () => ok(session('t2'))],
      'GET /v1/me': [() => ok(meWith(['VIEWER', 'ADMIN']))],
      'GET /v1/admin/creator-applications': [
        (init) => {
          listCalls++
          return header(init, 'Authorization') === 'Bearer t2' ? ok({ items: [], nextCursor: null }) : fail(401, 'UNAUTHORIZED')
        },
      ],
    })
    await initSession()

    const results = await Promise.all([
      apiRequest('/v1/admin/creator-applications', { auth: true }),
      apiRequest('/v1/admin/creator-applications', { auth: true }),
    ])

    expect(results).toEqual([
      { items: [], nextCursor: null },
      { items: [], nextCursor: null },
    ])
    expect(calls.filter((c) => c.key === 'POST /v1/auth/refresh')).toHaveLength(2) // boot + one shared refresh
    expect(listCalls).toBe(4)
  })

  it('signs out when the refresh after a 401 fails', async () => {
    fakeFetch({
      'POST /v1/auth/refresh': [() => ok(session('t1')), () => fail(401, 'SESSION_EXPIRED')],
      'GET /v1/me': [() => ok(meWith(['VIEWER', 'ADMIN']))],
      'GET /v1/admin/creator-applications': [() => fail(401, 'UNAUTHORIZED')],
    })
    await initSession()

    await expect(apiRequest('/v1/admin/creator-applications', { auth: true })).rejects.toMatchObject({ status: 401 })
    expect(useSessionStore.getState().status).toBe('anonymous')
  })

  it('does not refresh on 403 FORBIDDEN', async () => {
    const calls = fakeFetch({
      'POST /v1/auth/refresh': [() => ok(session('t1'))],
      'GET /v1/me': [() => ok(meWith(['VIEWER']))],
      'GET /v1/admin/creator-applications': [() => fail(403, 'FORBIDDEN')],
    })
    await initSession()

    await expect(apiRequest('/v1/admin/creator-applications', { auth: true })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(calls.filter((c) => c.key === 'POST /v1/auth/refresh')).toHaveLength(1)
  })
})

describe('login / logout', () => {
  it('logs in then loads the profile', async () => {
    const calls = fakeFetch({
      'POST /v1/auth/login': [() => ok(session('t9'))],
      'GET /v1/me': [() => ok(meWith(['VIEWER', 'ADMIN']))],
    })

    await login({ login: 'admin@nexuslive.dev', password: 'secret' })

    expect(JSON.parse(String(calls[0].init.body))).toEqual({ login: 'admin@nexuslive.dev', password: 'secret' })
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 't9' })
  })

  it('surfaces ACCOUNT_LOCKED with lockedUntil', async () => {
    fakeFetch({ 'POST /v1/auth/login': [() => fail(403, 'ACCOUNT_LOCKED', { lockedUntil: '2026-10-13T10:15:00Z' })] })

    await expect(login({ login: 'a', password: 'b' })).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
      details: { lockedUntil: '2026-10-13T10:15:00Z' },
    })
  })

  it('drops the half-open session when /v1/me fails after login', async () => {
    fakeFetch({
      'POST /v1/auth/login': [() => ok(session('t9'))],
      'GET /v1/me': [() => fail(503, 'SERVICE_UNAVAILABLE')],
    })

    await expect(login({ login: 'a', password: 'b' })).rejects.toMatchObject({ status: 503 })
    expect(useSessionStore.getState().status).toBe('anonymous')
  })

  it('sends X-NXL-Client on logout and clears locally even when it fails', async () => {
    useSessionStore.setState({ status: 'authenticated', accessToken: 't1', me: meWith(['ADMIN']) })
    const calls = fakeFetch({ 'POST /v1/auth/logout': [() => fail(403, 'FORBIDDEN')] })

    await logout()

    expect(header(calls[0].init, 'X-NXL-Client')).toBe('admin')
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null, me: null })
  })
})
