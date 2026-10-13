import { apiRequest, CLIENT_HEADER } from '@/lib/api-client'
import type { Me, Session } from '@/features/session/types'

export type LoginBody = {
  /** Email or username. */
  login: string
  password: string
}

export const sessionApi = {
  login: (body: LoginBody) => apiRequest<Session>('/v1/auth/login', { method: 'POST', body }),
  // Cookie endpoints: the refresh token rides in the HttpOnly `nxl_rt` cookie (Path=/v1/auth), the header is the CSRF guard.
  refresh: () => apiRequest<Session>('/v1/auth/refresh', { method: 'POST', headers: CLIENT_HEADER }),
  logout: () => apiRequest<void>('/v1/auth/logout', { method: 'POST', headers: CLIENT_HEADER }),
  me: () => apiRequest<Me>('/v1/me', { auth: true }),
}
