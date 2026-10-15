import type { PersonRef } from '@/features/admin-actions/types'

/** `actorRole` of an audit row (pkg/events Actor*). */
export type ActorRole = 'OWNER' | 'MODERATOR' | 'ADMIN' | 'USER' | 'SYSTEM'

/** `AuditEntry` (TSD GĐ5 §5.1): `actorRole` and `reason` are top-level; `actor` is null for the system. */
export type AuditEntry = {
  id: string
  actor: PersonRef | null
  actorRole: string
  action: string
  resourceType: string
  resourceId: string | null
  reason: string | null
  sourceService: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type AuditPage = { items: AuditEntry[]; nextCursor: string | null }

/** Actions written by safety-svc or mapped from chat / identity / channel-role events (TSD §6.5, brief A6). */
export const AUDIT_ACTIONS = [
  'CHAT_DELETE',
  'CHAT_TIMEOUT',
  'CHAT_UNTIMEOUT',
  'CHAT_BAN',
  'CHAT_UNBAN',
  'CHAT_PIN',
  'CHAT_UNPIN',
  'CHAT_SETTINGS_CHANGED',
  'BLOCKED_TERM_ADDED',
  'BLOCKED_TERM_REMOVED',
  'CHANNEL_ROLE_GRANTED',
  'CHANNEL_ROLE_REVOKED',
  'USER_LOCKED',
  'USER_UNLOCKED',
  'CHANNEL_SUSPENDED',
  'CHANNEL_RESTORED',
  'STREAM_TAKEDOWN',
  'REPORT_CLAIMED',
  'REPORT_RESOLVED',
  'REPORT_DISMISSED',
  'CREATOR_APPROVED',
  'CREATOR_REJECTED',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'ACCOUNT_TEMP_LOCKED',
  'REFRESH_REUSE',
  'ADMIN_PROMOTED',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const RESOURCE_TYPES = ['USER', 'CHANNEL', 'STREAM', 'MESSAGE', 'REPORT', 'CREATOR_APPLICATION'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

/** Filters of /audit-log as typed by the admin (dates are local calendar days, `to` inclusive). */
export type AuditFilters = {
  action: AuditAction | 'ALL'
  resourceType: ResourceType | 'ALL'
  resourceId: string
  /** A user id or a @username. */
  actor: string
  from: string
  to: string
}
