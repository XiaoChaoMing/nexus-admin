import { describe, expect, it } from 'vitest'
import { accountRole, accountState, lockAvailability } from '@/features/users/lib/account-status'

const now = Date.parse('2026-10-15T12:00:00Z')
const user = { id: 'u1', globalRole: 'USER' as const, status: 'ACTIVE' as const, lockedUntil: null }

describe('accountState', () => {
  it('treats an expired lock as active and keeps permanent locks', () => {
    expect(accountState('LOCKED', '2026-10-15T11:59:59Z', now)).toEqual({ kind: 'ACTIVE' })
    expect(accountState('LOCKED', '2026-10-16T00:00:00Z', now)).toEqual({ kind: 'LOCKED', until: '2026-10-16T00:00:00Z' })
    expect(accountState('LOCKED', null, now)).toEqual({ kind: 'LOCKED', until: null })
    expect(accountState('DELETED', null, now)).toEqual({ kind: 'DELETED' })
  })
})

describe('lockAvailability', () => {
  it('never offers a lock on oneself or another admin', () => {
    expect(lockAvailability(user, 'u1', now)).toBe('self')
    expect(lockAvailability({ ...user, globalRole: 'ADMIN' }, 'me', now)).toBe('admin')
  })

  it('offers lock or unlock from the effective state', () => {
    expect(lockAvailability(user, 'me', now)).toBe('lock')
    expect(lockAvailability({ ...user, status: 'LOCKED', lockedUntil: null }, 'me', now)).toBe('unlock')
    expect(lockAvailability({ ...user, status: 'LOCKED', lockedUntil: '2026-10-01T00:00:00Z' }, 'me', now)).toBe('lock')
    expect(lockAvailability({ ...user, status: 'DELETED' }, 'me', now)).toBe('deleted')
  })
})

describe('accountRole', () => {
  it('reads admin, creator, viewer', () => {
    expect(accountRole({ globalRole: 'ADMIN', channelId: 'c' })).toBe('ADMIN')
    expect(accountRole({ globalRole: 'USER', channelId: 'c' })).toBe('CREATOR')
    expect(accountRole({ globalRole: 'USER', channelId: null })).toBe('VIEWER')
  })
})
