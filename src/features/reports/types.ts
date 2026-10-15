import type { PersonRef } from '@/features/admin-actions/types'

export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'
export const REPORT_STATUSES: readonly ReportStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']

export const TARGET_TYPES = ['MESSAGE', 'USER', 'STREAM', 'CHANNEL'] as const
export type TargetType = (typeof TARGET_TYPES)[number]

export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'VIOLENCE', 'SENSITIVE', 'COPYRIGHT', 'OTHER'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

/** `AdminReport` (TSD GĐ5 §5.1). `sameTargetCount` counts the open reports on the target, this one included. */
export type AdminReport = {
  id: string
  targetType: TargetType
  target: {
    id: string
    /** `@username: <≤ 80 characters>` / `@username` / channel name / stream title. */
    label: string
    /** Path in the user web app (`/live/{streamId}`, `/{handle}`) or null. */
    link: string | null
    /** Author of the message, the user, or the channel owner. */
    userId: string | null
  }
  reason: ReportReason
  reporter: PersonRef
  status: ReportStatus
  assignedTo: PersonRef | null
  sameTargetCount: number
  createdAt: string
}

export type EvidenceStatus = 'CAPTURED' | 'NONE' | 'UNAVAILABLE'

/** A chat message captured when the report was filed (original body, even when deleted later). */
export type EvidenceItem = {
  messageId: string
  userId: string
  body: string
  fragments: unknown[]
  createdAt: string
  deleted: boolean
}

export type AdminActionType = 'LOCK_USER' | 'UNLOCK_USER' | 'SUSPEND_CHANNEL' | 'RESTORE_CHANNEL' | 'TAKEDOWN_STREAM'

export type AdminAction = {
  id: string
  type: AdminActionType
  targetType: 'USER' | 'CHANNEL' | 'STREAM'
  targetId: string
  reason: string
  expiresAt: string | null
  admin: PersonRef
  reportId: string | null
  createdAt: string
}

export type AdminReportDetail = AdminReport & {
  note: string | null
  /** Room of a MESSAGE (or of the USER evidence). */
  streamId: string | null
  evidence: EvidenceItem[]
  evidenceStatus: EvidenceStatus
  resolvedBy: PersonRef | null
  resolvedAt: string | null
  resolutionNote: string | null
  relatedReports: AdminReport[]
  actions: AdminAction[]
}

export type ReportPage = { items: AdminReport[]; nextCursor: string | null }

export type OpenCount = { open: number; inReview: number }

export type ResolveBody = { status: 'RESOLVED' | 'DISMISSED'; note: string; applyToSameTarget: boolean }

export type Resolved = { report: AdminReport; closedCount: number }

/** Status tabs of the queue (brief A1); "Cần xử lý" is the server default `OPEN,IN_REVIEW`. */
export const REPORT_TABS = ['TODO', 'RESOLVED', 'DISMISSED', 'ALL'] as const
export type ReportTab = (typeof REPORT_TABS)[number]

export const TAB_STATUSES: Record<ReportTab, readonly ReportStatus[]> = {
  TODO: ['OPEN', 'IN_REVIEW'],
  RESOLVED: ['RESOLVED'],
  DISMISSED: ['DISMISSED'],
  ALL: REPORT_STATUSES,
}

export type ReportFilters = {
  tab: ReportTab
  targetType: TargetType | 'ALL'
  reason: ReportReason | 'ALL'
}
