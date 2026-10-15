import type { AdminUser, UserStatus } from '@/features/users/types'

export type AccountState =
  | { kind: 'ACTIVE' }
  | { kind: 'LOCKED'; until: string | null }
  | { kind: 'DELETED' }

/** Status as it applies now: a lock whose end has passed no longer counts (identity reads it as ACTIVE at login). */
export function accountState(status: UserStatus, lockedUntil: string | null, now = Date.now()): AccountState {
  if (status === 'DELETED') return { kind: 'DELETED' }
  if (status === 'LOCKED') {
    if (lockedUntil && Date.parse(lockedUntil) <= now) return { kind: 'ACTIVE' }
    return { kind: 'LOCKED', until: lockedUntil }
  }
  return { kind: 'ACTIVE' }
}

export type LockAvailability = 'lock' | 'unlock' | 'admin' | 'self' | 'deleted'

/** Which lock control the detail shows (brief A3): none for admins, oneself or deleted accounts. */
export function lockAvailability(user: Pick<AdminUser, 'id' | 'globalRole' | 'status' | 'lockedUntil'>, myId: string | undefined, now = Date.now()): LockAvailability {
  if (user.id === myId) return 'self'
  if (user.globalRole === 'ADMIN') return 'admin'
  const state = accountState(user.status, user.lockedUntil, now)
  if (state.kind === 'DELETED') return 'deleted'

  return state.kind === 'LOCKED' ? 'unlock' : 'lock'
}

/** Role shown on the account: Quản trị viên · Creator (has a channel) · Người xem. */
export function accountRole(user: Pick<AdminUser, 'globalRole' | 'channelId'>): 'ADMIN' | 'CREATOR' | 'VIEWER' {
  if (user.globalRole === 'ADMIN') return 'ADMIN'
  return user.channelId ? 'CREATOR' : 'VIEWER'
}
