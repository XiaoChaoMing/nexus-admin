import type { AdminOperation } from '@/features/admin-actions/lib/action-errors'
import type { ActionAccepted, LockDuration, StreamRef } from '@/features/admin-actions/types'
import type { AdminReportDetail, ResolveBody, Resolved } from '@/features/reports/types'

/** What the admin does before closing a report (brief A2 "Xử lý báo cáo"; NXL-F §3.9 + chat moderation as Admin). */
export type ResolutionChoice =
  | { action: 'NONE' }
  | { action: 'DELETE_MESSAGE' }
  | { action: 'TIMEOUT'; durationSec: number }
  | { action: 'BAN' }
  | { action: 'LOCK_USER'; durationHours: LockDuration }
  | { action: 'SUSPEND_CHANNEL' }
  | { action: 'TAKEDOWN_STREAM' }

export type ResolutionAction = ResolutionChoice['action']

export function isOpen(report: Pick<AdminReportDetail, 'status'>): boolean {
  return report.status === 'OPEN' || report.status === 'IN_REVIEW'
}

/** The person behind the target: author of the message, the reported user, or the channel owner. */
export function targetUserId(report: Pick<AdminReportDetail, 'targetType' | 'target'>): string | null {
  return report.target.userId ?? (report.targetType === 'USER' ? report.target.id : null)
}

/** Other open reports on the same target that "close them too" would close. */
export function otherOpenReports(report: Pick<AdminReportDetail, 'status' | 'sameTargetCount'>): number {
  return Math.max(0, report.sameTargetCount - (isOpen(report) ? 1 : 0))
}

/**
 * Actions that fit the target (only these are offered): chat actions need the room (`streamId`) and the author;
 * a stream can be taken down or its channel suspended; a channel suspended.
 */
export function availableActions(report: AdminReportDetail): ResolutionAction[] {
  if (!isOpen(report)) return []
  const userId = targetUserId(report)
  const inRoom = report.streamId !== null && userId !== null

  switch (report.targetType) {
    case 'MESSAGE':
      return [
        'NONE',
        ...(report.streamId ? (['DELETE_MESSAGE'] as const) : []),
        ...(inRoom ? (['TIMEOUT', 'BAN'] as const) : []),
        ...(userId ? (['LOCK_USER'] as const) : []),
      ]
    case 'USER':
      return ['NONE', ...(inRoom ? (['TIMEOUT', 'BAN'] as const) : []), ...(userId ? (['LOCK_USER'] as const) : [])]
    case 'STREAM':
      return ['NONE', 'TAKEDOWN_STREAM', 'SUSPEND_CHANNEL']
    case 'CHANNEL':
      return ['NONE', 'SUSPEND_CHANNEL']
  }
}

/** Calls a resolution needs; injected so the sequence is testable without HTTP. */
export type ResolutionApi = {
  stream: (streamId: string) => Promise<StreamRef>
  lockUser: (userId: string, body: { durationHours: LockDuration; reason: string; reportId: string }) => Promise<ActionAccepted>
  suspendChannel: (channelId: string, body: { reason: string; reportId: string }) => Promise<ActionAccepted>
  takedownStream: (streamId: string, body: { reason: string; reportId: string }) => Promise<ActionAccepted>
  deleteMessage: (streamId: string, messageId: string) => Promise<unknown>
  timeout: (channelId: string, userId: string, durationSec: number, reason: string) => Promise<unknown>
  ban: (channelId: string, userId: string, reason: string) => Promise<unknown>
  resolve: (reportId: string, body: ResolveBody) => Promise<Resolved>
}

/** Which step failed: the action (nothing changed) or the closing of the report (the action did apply). */
export class ResolutionError extends Error {
  readonly stage: 'action' | 'resolve'
  readonly op: AdminOperation
  readonly original: unknown

  constructor(stage: 'action' | 'resolve', op: AdminOperation, original: unknown) {
    super(`${stage} failed`)
    this.name = 'ResolutionError'
    this.stage = stage
    this.op = op
    this.original = original
  }
}

const OPERATION: Record<ResolutionAction, AdminOperation | null> = {
  NONE: null,
  DELETE_MESSAGE: 'deleteMessage',
  TIMEOUT: 'timeout',
  BAN: 'ban',
  LOCK_USER: 'lockUser',
  SUSPEND_CHANNEL: 'suspendChannel',
  TAKEDOWN_STREAM: 'takedownStream',
}

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`report has no ${what}`)
  return value
}

/** Channel the action applies to: the reported channel, or the channel of the reported stream / chat room. */
async function channelOf(report: AdminReportDetail, api: ResolutionApi): Promise<string> {
  if (report.channelId) return report.channelId
  if (report.targetType === 'CHANNEL') return report.target.id
  const streamId = report.targetType === 'STREAM' ? report.target.id : required(report.streamId, 'stream')

  return (await api.stream(streamId)).channelId
}

async function runAction(report: AdminReportDetail, choice: ResolutionChoice, reason: string, api: ResolutionApi): Promise<void> {
  const reportId = report.id
  switch (choice.action) {
    case 'NONE':
      return
    case 'DELETE_MESSAGE':
      await api.deleteMessage(required(report.streamId, 'stream'), report.target.id)
      return
    case 'TIMEOUT':
      await api.timeout(await channelOf(report, api), required(targetUserId(report), 'user'), choice.durationSec, reason)
      return
    case 'BAN':
      await api.ban(await channelOf(report, api), required(targetUserId(report), 'user'), reason)
      return
    case 'LOCK_USER':
      await api.lockUser(required(targetUserId(report), 'user'), { durationHours: choice.durationHours, reason, reportId })
      return
    case 'SUSPEND_CHANNEL':
      await api.suspendChannel(await channelOf(report, api), { reason, reportId })
      return
    case 'TAKEDOWN_STREAM':
      await api.takedownStream(report.target.id, { reason, reportId })
      return
  }
}

/**
 * "Xử lý": run the chosen action (with `reportId` so it shows in the report's history), then close the report as
 * RESOLVED with the same text as the conclusion. A failed action leaves the report open.
 */
export async function resolveWithAction(
  report: AdminReportDetail,
  choice: ResolutionChoice,
  input: { reason: string; applyToSameTarget: boolean },
  api: ResolutionApi,
): Promise<Resolved> {
  const op = OPERATION[choice.action]
  if (op) {
    try {
      await runAction(report, choice, input.reason, api)
    } catch (err) {
      throw new ResolutionError('action', op, err)
    }
  }

  try {
    return await api.resolve(report.id, { status: 'RESOLVED', note: input.reason, applyToSameTarget: input.applyToSameTarget })
  } catch (err) {
    throw new ResolutionError('resolve', 'resolve', err)
  }
}
