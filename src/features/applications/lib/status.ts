import type { ApplicationStatus } from '@/features/applications/types'

/** Badge variant per status; the label is always text too (colour is never the only cue). */
export const STATUS_BADGE: Record<ApplicationStatus, 'warning' | 'success' | 'secondary' | 'outline'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'outline',
  CANCELLED: 'secondary',
}
