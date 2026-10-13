import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/features/applications/components/status-badge'
import { VerifiedBadge } from '@/features/applications/components/verified-badge'
import type { AdminApplication, StatusFilter } from '@/features/applications/types'

type ApplicationsTableProps = {
  items: AdminApplication[]
  status: StatusFilter
  selectedId: string | undefined
  loading: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  onSelect: (id: string) => void
  onLoadMore: () => void
  onRetry: () => void
}

const th = 'h-10 px-3 text-left text-label-sm font-semibold text-muted-foreground whitespace-nowrap'
const td = 'px-3 py-3 align-middle'

/**
 * Oldest first. Rows use a roving tabindex: Tab enters the table on the selected (or first) row,
 * ↑/↓/Home/End move between rows, Enter/Space opens the detail.
 */
export function ApplicationsTable({
  items,
  status,
  selectedId,
  loading,
  error,
  hasMore,
  loadingMore,
  onSelect,
  onLoadMore,
  onRetry,
}: ApplicationsTableProps) {
  const { t } = useTranslation(['applications', 'common'])
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const tabStop = items.some((a) => a.id === selectedId) ? selectedId : items[0]?.id

  const focusRow = (index: number) => {
    const rows = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')
    if (!rows?.length) return
    rows[Math.max(0, Math.min(rows.length - 1, index))].focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number, id: string) => {
    switch (e.key) {
      case 'ArrowDown':
        focusRow(index + 1)
        break
      case 'ArrowUp':
        focusRow(index - 1)
        break
      case 'Home':
        focusRow(0)
        break
      case 'End':
        focusRow(items.length - 1)
        break
      case 'Enter':
      case ' ':
        onSelect(id)
        break
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-body-md" data-testid="applications-table">
          <caption className="sr-only">{t('table.caption')}</caption>
          <thead className="border-b bg-card">
            <tr>
              <th scope="col" className={th}>
                {t('table.username')}
              </th>
              <th scope="col" className={th}>
                {t('table.legalName')}
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                {t('table.age')}
              </th>
              <th scope="col" className={th}>
                {t('table.emailVerified')}
              </th>
              <th scope="col" className={th}>
                {t('table.submittedAt')}
              </th>
              <th scope="col" className={th}>
                {t('table.status')}
              </th>
            </tr>
          </thead>
          <tbody ref={bodyRef} aria-busy={loading || undefined}>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: 6 }, (__, j) => (
                    <td key={j} className={td}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              items.map((app, index) => {
                const selected = app.id === selectedId
                return (
                  <tr
                    key={app.id}
                    data-row
                    tabIndex={app.id === tabStop ? 0 : -1}
                    aria-current={selected || undefined}
                    aria-label={t('table.rowLabel', { username: app.user.username, status: t(`status.${app.status}`) })}
                    onClick={() => onSelect(app.id)}
                    onKeyDown={(e) => onKeyDown(e, index, app.id)}
                    className={cn(
                      'cursor-pointer border-b transition-colors outline-none last:border-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                      selected && 'bg-card',
                    )}
                  >
                    <td className={cn(td, 'border-l-2 font-medium text-foreground', selected ? 'border-l-primary' : 'border-l-transparent')}>
                      @{app.user.username}
                    </td>
                    <td className={cn(td, 'max-w-56 truncate')}>{app.legalName}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{app.age}</td>
                    <td className={td}>
                      <VerifiedBadge verified={app.user.emailVerified} />
                    </td>
                    <td className={cn(td, 'whitespace-nowrap text-muted-foreground')}>
                      <time dateTime={app.createdAt}>{formatDateTime(app.createdAt)}</time>
                    </td>
                    <td className={td}>
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {!loading && error && (
        <div role="alert" className="flex items-center justify-between gap-3 border-t px-4 py-3 text-body-md">
          <span className="text-destructive">{error}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t('common:actions.retry')}
          </Button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="border-t px-4 py-10 text-center text-body-md text-muted-foreground">
          {status === 'PENDING' ? t('table.emptyPending') : t('table.empty')}
        </p>
      )}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-center border-t px-4 py-3">
          {hasMore ? (
            <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore}>
              {t('table.loadMore')}
            </Button>
          ) : (
            <p className="text-body-sm text-subtle-foreground">{t('table.end')}</p>
          )}
        </div>
      )}
    </div>
  )
}
