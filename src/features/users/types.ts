export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DELETED'
export const USER_STATUSES: readonly UserStatus[] = ['ACTIVE', 'LOCKED', 'DELETED']

/** `AdminUserRow` from safety's copy (lookup): the status is the effective one (an expired lock reads ACTIVE). */
export type AdminUserRow = {
  id: string
  username: string
  displayName: string
  globalRole: 'USER' | 'ADMIN'
  status: UserStatus
  lockedUntil: string | null
  openReports: number
}

export type UserPage = { items: AdminUserRow[]; nextCursor: string | null }

/** `AdminUser` from identity (`GET /v1/admin/users/{id}`): the real account state. */
export type AdminUser = {
  id: string
  username: string
  displayName: string
  email: string
  emailVerified: boolean
  globalRole: 'USER' | 'ADMIN'
  status: UserStatus
  lockedUntil: string | null
  lockKind: 'FAILED_LOGIN' | 'ADMIN' | null
  lockReason: string | null
  channelId: string | null
  createdAt: string
}
