import type { LockDuration } from '@/features/admin-actions/types'
import type { AdminAction, AdminReport } from '@/features/reports/types'

/** `@an: tin nhắn…` / `@an` → `@an`; channel names and stream titles have no author. */
export function authorFromLabel(report: Pick<AdminReport, 'targetType' | 'target'>): string | null {
  if (report.targetType !== 'MESSAGE' && report.targetType !== 'USER') return null
  const match = /^(@[^:\s]+)/.exec(report.target.label)

  return match && match[1] !== '@?' ? match[1] : null
}

const HOUR_MS = 3_600_000

/** Lock length of a LOCK_USER action from its window (24 h / 7 days / 30 days), null when permanent. */
export function lockDurationOf(action: Pick<AdminAction, 'createdAt' | 'expiresAt'>): LockDuration | 'OTHER' {
  if (!action.expiresAt) return null
  const hours = Math.round((Date.parse(action.expiresAt) - Date.parse(action.createdAt)) / HOUR_MS)
  if (hours === 24 || hours === 168 || hours === 720) return hours

  return 'OTHER'
}
