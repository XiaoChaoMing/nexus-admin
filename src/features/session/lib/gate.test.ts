import { describe, expect, it } from 'vitest'
import { isAdmin, sessionGate } from '@/features/session/lib/gate'
import { safeReturnTo } from '@/features/session/lib/return-to'
import { meWith } from '@/features/session/test-fixtures'

describe('sessionGate', () => {
  it('waits while restoring or while the profile loads', () => {
    expect(sessionGate('unknown', null)).toBe('loading')
    expect(sessionGate('authenticated', null)).toBe('loading')
  })

  it('sends anonymous visitors to login and surfaces boot errors', () => {
    expect(sessionGate('anonymous', null)).toBe('login')
    expect(sessionGate('error', null)).toBe('error')
  })

  it('lets only ADMIN through', () => {
    expect(sessionGate('authenticated', meWith(['VIEWER', 'ADMIN']))).toBe('admin')
    expect(sessionGate('authenticated', meWith(['VIEWER']))).toBe('forbidden')
    expect(sessionGate('authenticated', meWith(['VIEWER', 'CREATOR']))).toBe('forbidden')
    expect(isAdmin(null)).toBe(false)
  })
})

describe('safeReturnTo', () => {
  it('keeps internal paths only', () => {
    expect(safeReturnTo({ from: '/creator-applications/abc?status=ALL' })).toBe('/creator-applications/abc?status=ALL')
    expect(safeReturnTo({ from: '//evil.example' })).toBe('/creator-applications')
    expect(safeReturnTo({ from: 'https://evil.example' })).toBe('/creator-applications')
    expect(safeReturnTo({ from: '/login' })).toBe('/creator-applications')
    expect(safeReturnTo(null)).toBe('/creator-applications')
  })
})
