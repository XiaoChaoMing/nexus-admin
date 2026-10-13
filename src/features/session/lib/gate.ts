import type { SessionStatus } from '@/features/session/session-store'
import type { Me } from '@/features/session/types'

export type Gate = 'loading' | 'login' | 'error' | 'forbidden' | 'admin'

export function isAdmin(me: Me | null): boolean {
  return me?.roles.includes('ADMIN') ?? false
}

/**
 * What the protected area shows. The UI check is only a convenience: identity still rejects every
 * `/v1/admin/**` call without the ADMIN claim (TSD GĐ1 §3 S6).
 */
export function sessionGate(status: SessionStatus, me: Me | null): Gate {
  switch (status) {
    case 'unknown':
      return 'loading'
    case 'anonymous':
      return 'login'
    case 'error':
      return 'error'
    case 'authenticated':
      if (!me) return 'loading'
      return isAdmin(me) ? 'admin' : 'forbidden'
  }
}
