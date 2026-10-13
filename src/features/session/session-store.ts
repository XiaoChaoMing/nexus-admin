import { create } from 'zustand'
import type { ApiError } from '@/lib/api-error'
import type { Me } from '@/features/session/types'

/**
 * unknown: restoring the session at boot · anonymous: must sign in · authenticated: token held
 * (profile may still be loading) · error: the backend could not be reached while restoring.
 */
export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated' | 'error'

type SessionState = {
  status: SessionStatus
  /** Kept in memory only; never written to storage (XSS would expose it). */
  accessToken: string | null
  me: Me | null
  error: ApiError | null
  setToken: (accessToken: string) => void
  setMe: (me: Me) => void
  fail: (error: ApiError) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  accessToken: null,
  me: null,
  error: null,
  setToken: (accessToken) => set({ status: 'authenticated', accessToken, error: null }),
  setMe: (me) => set({ me }),
  fail: (error) => set({ status: 'error', accessToken: null, me: null, error }),
  clear: () => set({ status: 'anonymous', accessToken: null, me: null, error: null }),
}))
