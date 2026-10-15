import {
  REPORT_REASONS,
  REPORT_TABS,
  TAB_STATUSES,
  TARGET_TYPES,
  type ReportFilters,
  type ReportReason,
  type ReportTab,
  type TargetType,
} from '@/features/reports/types'

const pick = <V extends string>(values: readonly V[], raw: string | null, fallback: V): V =>
  values.includes(raw as V) ? (raw as V) : fallback

/** `/reports?tab=&targetType=&reason=` → filters; unknown values fall back to the defaults. */
export function parseReportFilters(params: URLSearchParams): ReportFilters {
  return {
    tab: pick<ReportTab>(REPORT_TABS, params.get('tab'), 'TODO'),
    targetType: pick<TargetType | 'ALL'>(['ALL', ...TARGET_TYPES], params.get('targetType'), 'ALL'),
    reason: pick<ReportReason | 'ALL'>(['ALL', ...REPORT_REASONS], params.get('reason'), 'ALL'),
  }
}

/** Filters → URL search (defaults omitted so the plain `/reports` stays canonical). */
export function reportFiltersSearch(filters: ReportFilters): string {
  const params = new URLSearchParams()
  if (filters.tab !== 'TODO') params.set('tab', filters.tab)
  if (filters.targetType !== 'ALL') params.set('targetType', filters.targetType)
  if (filters.reason !== 'ALL') params.set('reason', filters.reason)
  const search = params.toString()

  return search ? `?${search}` : ''
}

/** Filters → `GET /v1/admin/reports` query (status is a CSV; targetType / reason omitted for "all"). */
export function reportListQuery(filters: ReportFilters, cursor: string | null, limit: number): URLSearchParams {
  const query = new URLSearchParams({ status: TAB_STATUSES[filters.tab].join(','), limit: String(limit) })
  if (filters.targetType !== 'ALL') query.set('targetType', filters.targetType)
  if (filters.reason !== 'ALL') query.set('reason', filters.reason)
  if (cursor) query.set('cursor', cursor)

  return query
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return filters.targetType !== 'ALL' || filters.reason !== 'ALL'
}
