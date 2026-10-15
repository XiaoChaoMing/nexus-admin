import { Fragment, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  /** Numbers line up on the right. */
  numeric?: boolean
  /** Hidden visually but kept for screen readers (e.g. an actions column). */
  srOnlyHeader?: boolean
}

type DataTableProps<T> = {
  testId: string
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Accessible name of a row ("Báo cáo về @an, Mới"). */
  rowLabel?: (row: T) => string
  /** Rows become keyboard-selectable (roving tabindex, ↑/↓/Home/End, Enter/Space). */
  onSelect?: (row: T) => void
  selectedKey?: string
  /** With onSelect: the selected row expands in place instead of opening a panel (audit log). */
  renderExpanded?: (row: T) => ReactNode
  loading: boolean
  error: string | null
  onRetry: () => void
  empty: string
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** "Đã hiện tất cả." under the last page. */
  endLabel?: string
  minWidth?: string
}

const th = 'h-10 px-3 text-left text-label-sm font-semibold whitespace-nowrap text-muted-foreground'
const td = 'px-3 py-3 align-middle'

/**
 * Table of the admin console (brief GĐ5 A0): 10px frame, 40px header on the card tone, hover fill, the selected row
 * marked by the card tone and a 2px primary edge, skeleton rows, errors and "Tải thêm" in the footer.
 */
export function DataTable<T>({
  testId,
  caption,
  columns,
  rows,
  rowKey,
  rowLabel,
  onSelect,
  selectedKey,
  renderExpanded,
  loading,
  error,
  onRetry,
  empty,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  endLabel,
  minWidth = 'min-w-[720px]',
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const keys = rows.map(rowKey)
  const tabStop = selectedKey && keys.includes(selectedKey) ? selectedKey : keys[0]

  const focusRow = (index: number) => {
    const list = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')
    if (!list?.length) return
    list[Math.max(0, Math.min(list.length - 1, index))].focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number, row: T) => {
    // Keys typed on a button or link inside the row belong to that control.
    if (e.target !== e.currentTarget) return
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
        focusRow(rows.length - 1)
        break
      case 'Enter':
      case ' ':
        onSelect?.(row)
        break
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className={cn('w-full border-collapse text-body-md', minWidth)} data-testid={testId}>
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-card">
            <tr>
              {columns.map((c) => (
                <th key={c.id} scope="col" className={cn(th, c.numeric && 'text-right', c.className)}>
                  {c.srOnlyHeader ? <span className="sr-only">{c.header}</span> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={bodyRef} aria-busy={loading || undefined}>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((c) => (
                    <td key={c.id} className={td}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              rows.map((row, index) => {
                const key = keys[index]
                const selected = key === selectedKey
                const interactive = Boolean(onSelect)
                const expanded = selected && renderExpanded ? renderExpanded(row) : null

                return (
                  <Fragment key={key}>
                    <tr
                      data-row
                      tabIndex={interactive ? (key === tabStop ? 0 : -1) : undefined}
                      aria-current={interactive && !renderExpanded && selected ? true : undefined}
                      aria-expanded={renderExpanded ? selected : undefined}
                      aria-label={rowLabel?.(row)}
                      onClick={interactive ? () => onSelect?.(row) : undefined}
                      onKeyDown={interactive ? (e) => onKeyDown(e, index, row) : undefined}
                      className={cn(
                        'border-b transition-colors last:border-0',
                        interactive &&
                          'cursor-pointer outline-none hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        selected && 'bg-card',
                      )}
                    >
                      {columns.map((c, ci) => (
                        <td
                          key={c.id}
                          className={cn(
                            td,
                            c.numeric && 'text-right tabular-nums',
                            ci === 0 && interactive && 'border-l-2',
                            ci === 0 && interactive && (selected ? 'border-l-primary' : 'border-l-transparent'),
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                    {expanded && (
                      <tr className="border-b bg-card last:border-0">
                        <td colSpan={columns.length} className="border-l-2 border-l-primary px-4 py-3">
                          {expanded}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
          </tbody>
        </table>
      </div>

      {!loading && error && (
        <div role="alert" className="flex items-center justify-between gap-3 border-t px-4 py-3 text-body-md">
          <span className="text-destructive">{error}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && <p className="border-t px-4 py-10 text-center text-body-md text-muted-foreground">{empty}</p>}
      {!loading && rows.length > 0 && (hasMore || endLabel) && (
        <div className="flex items-center justify-center border-t px-4 py-3">
          {hasMore ? (
            <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore}>
              {t('table.loadMore')}
            </Button>
          ) : (
            <p className="text-body-sm text-subtle-foreground">{endLabel}</p>
          )}
        </div>
      )}
    </div>
  )
}
