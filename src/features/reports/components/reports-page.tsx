import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DataTable, type Column } from '@/components/admin/data-table'
import { FilterBar, FilterSelect } from '@/components/admin/filter-bar'
import { AdminPage, MasterDetail } from '@/components/admin/page-layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/format'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { ReportDetailPanel } from '@/features/reports/components/report-detail'
import { ReportStatusBadge, ReportTarget } from '@/features/reports/components/report-badges'
import { useReportList } from '@/features/reports/hooks/use-reports'
import { hasActiveFilters, parseReportFilters, reportFiltersSearch } from '@/features/reports/lib/filters'
import { REPORT_REASONS, REPORT_TABS, TARGET_TYPES, type AdminReport, type ReportFilters, type ReportTab } from '@/features/reports/types'

/** /reports[/:id]?tab=&targetType=&reason= — filters and the open report live in the URL (linkable, Back closes). */
export function ReportsPage() {
  const { t } = useTranslation('reports')
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorMessage = useErrorMessage()
  const filters = parseReportFilters(params)
  const list = useReportList(filters)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  const go = (nextId: string | undefined, next: ReportFilters = filters) =>
    navigate(`/reports${nextId ? `/${encodeURIComponent(nextId)}` : ''}${reportFiltersSearch(next)}`)
  const close = () => go(undefined)

  const columns: Column<AdminReport>[] = [
    { id: 'target', header: t('table.target'), cell: (r) => <ReportTarget report={r} className="max-w-60 font-medium text-foreground" /> },
    { id: 'reason', header: t('table.reason'), cell: (r) => t(`reason.${r.reason}`), className: 'whitespace-nowrap' },
    { id: 'reporter', header: t('table.reporter'), cell: (r) => `@${r.reporter.username}`, className: 'max-w-32 truncate' },
    { id: 'same', header: t('table.sameTarget'), cell: (r) => r.sameTargetCount, numeric: true },
    { id: 'status', header: t('table.status'), cell: (r) => <ReportStatusBadge status={r.status} /> },
    {
      id: 'assignee',
      header: t('table.assignee'),
      cell: (r) => (r.assignedTo ? `@${r.assignedTo.username}` : <span className="text-subtle-foreground">—</span>),
      className: 'max-w-36 truncate',
    },
    {
      id: 'createdAt',
      header: t('table.createdAt'),
      cell: (r) => <time dateTime={r.createdAt}>{formatDateTime(r.createdAt)}</time>,
      className: 'whitespace-nowrap text-muted-foreground',
    },
  ]

  const filtered = hasActiveFilters(filters)
  const empty = filtered ? t('table.emptyFiltered') : filters.tab === 'TODO' ? t('table.emptyTodo') : t('table.empty')

  return (
    <AdminPage title={t('title')} subtitle={t('subtitle')}>
      <Tabs value={filters.tab} onValueChange={(v) => go(undefined, { ...filters, tab: v as ReportTab })}>
        <TabsList aria-label={t('filter.statusLabel')}>
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tab.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterBar label={t('filter.label')}>
        <FilterSelect
          label={t('filter.targetType')}
          value={filters.targetType}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...TARGET_TYPES.map((v) => ({ value: v, label: t(`targetType.${v}`) }))]}
          onChange={(targetType) => go(undefined, { ...filters, targetType })}
        />
        <FilterSelect
          label={t('filter.reason')}
          value={filters.reason}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...REPORT_REASONS.map((v) => ({ value: v, label: t(`reason.${v}`) }))]}
          onChange={(reason) => go(undefined, { ...filters, reason })}
        />
        {filtered && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => go(undefined, { ...filters, targetType: 'ALL', reason: 'ALL' })}>
            {t('filter.clear')}
          </Button>
        )}
      </FilterBar>

      <MasterDetail
        placeholder={t('detail.placeholder')}
        onClose={close}
        table={
          <DataTable
            testId="reports-table"
            caption={t('table.caption')}
            columns={columns}
            rows={items}
            rowKey={(r) => r.id}
            rowLabel={(r) => t('table.rowLabel', { target: r.target.label, status: t(`status.${r.status}`) })}
            selectedKey={id}
            onSelect={(r) => go(r.id)}
            loading={list.isPending}
            error={list.error ? errorMessage(list.error) || t('table.loadError') : null}
            onRetry={() => void list.refetch()}
            empty={empty}
            hasMore={list.hasNextPage}
            loadingMore={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
            endLabel={t('table.end')}
            minWidth="min-w-[820px]"
          />
        }
        detail={id ? <ReportDetailPanel key={id} id={id} onClose={close} onOpen={(next) => go(next)} /> : null}
      />
    </AdminPage>
  )
}
