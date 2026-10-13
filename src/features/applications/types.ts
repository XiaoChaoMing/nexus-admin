export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

/** Filter values of `GET /v1/admin/creator-applications?status=`; PENDING is the server default. */
export const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export function parseStatusFilter(value: string | null): StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value ?? '') ? (value as StatusFilter) : 'PENDING'
}

/** `AdminApplication` (TSD GĐ1 §4.1): the applicant's view plus `age` and the account. */
export type AdminApplication = {
  id: string
  status: ApplicationStatus
  legalName: string
  /** `YYYY-MM-DD`. */
  birthDate: string
  note: string | null
  rejectReason: string | null
  createdAt: string
  reviewedAt: string | null
  /** Whole years today, computed by identity. */
  age: number
  user: {
    id: string
    username: string
    displayName: string
    email: string
    emailVerified: boolean
    createdAt: string
  }
}

export type ApplicationPage = {
  items: AdminApplication[]
  nextCursor: string | null
}
