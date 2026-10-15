import { apiRequest } from '@/lib/api-client'
import type { ActionAccepted, LockDuration, StreamRef } from '@/features/admin-actions/types'

const enc = encodeURIComponent

type ActionBody = { reason: string; reportId?: string }

const post = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', auth: true, body })

/**
 * Admin actions of safety-svc (`202 {actionId}`, applied by identity / channel / stream within seconds) and the
 * chat moderation calls an admin may make (chat-svc, Admin counts as a moderator of every channel).
 */
export const adminActionsApi = {
  lockUser: (userId: string, body: ActionBody & { durationHours: LockDuration }) =>
    post<ActionAccepted>(`/v1/admin/users/${enc(userId)}/lock`, body),
  unlockUser: (userId: string, reason: string) => post<ActionAccepted>(`/v1/admin/users/${enc(userId)}/unlock`, { reason }),
  suspendChannel: (channelId: string, body: ActionBody) => post<ActionAccepted>(`/v1/admin/channels/${enc(channelId)}/suspend`, body),
  restoreChannel: (channelId: string, reason: string) => post<ActionAccepted>(`/v1/admin/channels/${enc(channelId)}/restore`, { reason }),
  takedownStream: (streamId: string, body: ActionBody) => post<ActionAccepted>(`/v1/admin/streams/${enc(streamId)}/takedown`, body),

  deleteMessage: (streamId: string, messageId: string) =>
    apiRequest<void>(`/v1/chat/rooms/${enc(streamId)}/messages/${enc(messageId)}`, { method: 'DELETE', auth: true }),
  timeout: (channelId: string, userId: string, durationSec: number, reason: string) =>
    apiRequest<unknown>(`/v1/channels/${enc(channelId)}/timeouts/${enc(userId)}`, { method: 'PUT', auth: true, body: { durationSec, reason } }),
  ban: (channelId: string, userId: string, reason: string) =>
    apiRequest<unknown>(`/v1/channels/${enc(channelId)}/bans/${enc(userId)}`, { method: 'PUT', auth: true, body: { reason } }),

  stream: (streamId: string) => apiRequest<StreamRef>(`/v1/streams/${enc(streamId)}`, { auth: true }),
}
