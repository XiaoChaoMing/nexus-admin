export type GlobalRole = 'USER' | 'ADMIN'

/** Platform roles from `GET /v1/me`: always VIEWER, plus CREATOR with a channel and ADMIN for globalRole ADMIN. */
export type Role = 'VIEWER' | 'CREATOR' | 'ADMIN'

/** identity-svc `User` (TSD GĐ1 §4.1). */
export type User = {
  id: string
  username: string
  displayName: string
  email: string
  emailVerified: boolean
  globalRole: GlobalRole
  birthDate: string | null
  locale: string
  timezone: string
  isCreator: boolean
  channelId: string | null
  createdAt: string
}

/** Response of login / refresh. */
export type Session = {
  accessToken: string
  expiresIn: number
  user: User
}

/** `GET /v1/me`. */
export type Me = {
  user: User
  roles: Role[]
  isCreator: boolean
  channelId: string | null
  unreadNotifications: number
  preferences: { sidebarCollapsed: boolean; matureVisible: boolean }
}
