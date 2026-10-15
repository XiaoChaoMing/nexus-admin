import { apiRequest } from '@/lib/api-client'
import { reportListQuery } from '@/features/reports/lib/filters'
import type { AdminReport, AdminReportDetail, OpenCount, ReportFilters, ReportPage, ResolveBody, Resolved } from '@/features/reports/types'

export const REPORT_PAGE_SIZE = 20

const BASE = '/v1/admin/reports'
const enc = encodeURIComponent

export const reportsApi = {
  /** Oldest first; `nextCursor` null on the last page. */
  list: (filters: ReportFilters, cursor: string | null, signal?: AbortSignal) =>
    apiRequest<ReportPage>(`${BASE}?${reportListQuery(filters, cursor, REPORT_PAGE_SIZE)}`, { auth: true, signal }),
  openCount: (signal?: AbortSignal) => apiRequest<OpenCount>(`${BASE}/open-count`, { auth: true, signal }),
  get: (id: string, signal?: AbortSignal) => apiRequest<AdminReportDetail>(`${BASE}/${enc(id)}`, { auth: true, signal }),
  claim: (id: string) => apiRequest<AdminReport>(`${BASE}/${enc(id)}/claim`, { method: 'POST', auth: true }),
  resolve: (id: string, body: ResolveBody) => apiRequest<Resolved>(`${BASE}/${enc(id)}/resolve`, { method: 'POST', auth: true, body }),
}
