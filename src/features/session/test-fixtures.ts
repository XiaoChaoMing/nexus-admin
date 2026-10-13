import type { Me, Role } from '@/features/session/types'

/** `GET /v1/me` payload for tests. */
export function meWith(roles: Role[], id = 'u1'): Me {
  return {
    user: {
      id,
      username: 'minh',
      displayName: 'Minh',
      email: 'minh@example.com',
      emailVerified: true,
      globalRole: roles.includes('ADMIN') ? 'ADMIN' : 'USER',
      birthDate: null,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      isCreator: roles.includes('CREATOR'),
      channelId: null,
      createdAt: '2026-10-01T00:00:00Z',
    },
    roles,
    isCreator: roles.includes('CREATOR'),
    channelId: null,
    unreadNotifications: 0,
    preferences: { sidebarCollapsed: false, matureVisible: false },
  }
}
