import type { PersonRef } from '@/features/admin-actions/types'

export type ChannelStatus = 'ACTIVE' | 'SUSPENDED'
export const CHANNEL_STATUSES: readonly ChannelStatus[] = ['ACTIVE', 'SUSPENDED']

/** `AdminChannel` from safety's copy (suspended channels included; the public profile answers 403 for them). */
export type AdminChannel = {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
  owner: PersonRef
  status: ChannelStatus
  suspendedAt: string | null
  currentStreamId: string | null
  openReports: number
}

export type ChannelPage = { items: AdminChannel[]; nextCursor: string | null }
