import { useState, type FormEvent } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { DataTable, type Column } from '@/components/admin/data-table'
import { FilterBar, FilterInput, FilterSelect } from '@/components/admin/filter-bar'
import { AdminPage } from '@/components/admin/page-layout'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { useAuditLog } from '@/features/audit/hooks/use-audit'
import { useAuditLabels } from '@/features/audit/hooks/use-audit-labels'
import {
  auditFilterProblem,
  type AuditFilterProblem,
  auditFiltersSearch,
  EMPTY_AUDIT_FILTERS,
  hasAuditFilters,
  metadataEntries,
  parseAuditFilters,
} from '@/features/audit/lib/audit-filters'
import { AUDIT_ACTIONS, RESOURCE_TYPES, type AuditEntry, type AuditFilters } from '@/features/audit/types'

/** Detail page of a resource inside this console, when there is one. */
function resourcePath(entry: AuditEntry): string | null {
  if (!entry.resourceId) return null
  if (entry.resourceType === 'USER') return `/users/${encodeURIComponent(entry.resourceId)}`
  if (entry.resourceType === 'CHANNEL') return `/channels/${encodeURIComponent(entry.resourceId)}`
  if (entry.resourceType === 'REPORT') return `/reports/${encodeURIComponent(entry.resourceId)}?tab=ALL`
  return null
}

function ExpandedEntry({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('audit')
  const meta = metadataEntries(entry.metadata)

  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-body-sm sm:grid-cols-[10rem_1fr]" data-testid="audit-entry-detail">
      <dt className="text-muted-foreground">{t('detail.resourceId')}</dt>
      <dd className="font-mono break-all text-foreground">{entry.resourceId ?? '—'}</dd>
      <dt className="text-muted-foreground">{t('detail.actorId')}</dt>
      <dd className="font-mono break-all text-foreground">{entry.actor?.id ?? t('system')}</dd>
      <dt className="text-muted-foreground">{t('table.reason')}</dt>
      <dd className="break-words whitespace-pre-wrap text-foreground">{entry.reason ?? '—'}</dd>
      {meta.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-muted-foreground">{key}</dt>
          <dd className="break-words whitespace-pre-wrap text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

type AuditFilterFormProps = {
  filters: AuditFilters
  problem: AuditFilterProblem
  onApply: (filters: AuditFilters) => void
}

const trimmed = (f: AuditFilters): AuditFilters => ({ ...f, resourceId: f.resourceId.trim(), actor: f.actor.trim() })

function problemMessage(t: TFunction<'audit'>, problem: AuditFilterProblem): string | null {
  if (problem === 'resourceId') return t('filter.resourceIdInvalid')
  if (problem === 'range') return t('filter.rangeInvalid')
  return null
}

/**
 * Admin/Filter Bar of the log: selects apply at once, text and dates on "Lọc" / Enter. Keyed by the URL search, so
 * Back / forward and links (?resourceId=…) refill it.
 */
function AuditFilterForm({ filters, problem, onApply }: AuditFilterFormProps) {
  const { t } = useTranslation('audit')
  const labels = useAuditLabels()
  const [draft, setDraft] = useState<AuditFilters>(filters)
  const problemText = problemMessage(t, problem)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onApply(trimmed(draft))
  }

  return (
    <form onSubmit={submit} noValidate>
      <FilterBar label={t('filter.label')}>
        <FilterSelect
          label={t('filter.action')}
          value={draft.action}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: labels.action(a) }))]}
          onChange={(action) => onApply(trimmed({ ...draft, action }))}
        />
        <FilterSelect
          label={t('filter.resourceType')}
          value={draft.resourceType}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...RESOURCE_TYPES.map((r) => ({ value: r, label: labels.resourceType(r) }))]}
          onChange={(resourceType) => onApply(trimmed({ ...draft, resourceType }))}
        />
        <FilterInput
          label={t('filter.resourceId')}
          value={draft.resourceId}
          invalid={problem === 'resourceId'}
          placeholder="0192…"
          className="w-72"
          onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
        />
        <FilterInput
          label={t('filter.actor')}
          value={draft.actor}
          placeholder={t('filter.actorPlaceholder')}
          className="w-48"
          onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
        />
        <FilterInput label={t('filter.from')} type="date" value={draft.from} invalid={problem === 'range'} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <FilterInput label={t('filter.to')} type="date" value={draft.to} invalid={problem === 'range'} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <Button type="submit" size="sm" className="h-9">
          {t('filter.apply')}
        </Button>
        {hasAuditFilters(filters) && (
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => onApply(EMPTY_AUDIT_FILTERS)}>
            {t('filter.clear')}
          </Button>
        )}
      </FilterBar>
      {problemText && (
        <p role="alert" className="mt-2 text-label-sm text-destructive">
          {problemText}
        </p>
      )}
    </form>
  )
}

/** /audit-log?action=&resourceType=&resourceId=&actor=&from=&to= — Nhật ký hệ thống (brief A6), newest first. */
export function AuditLogPage() {
  const { t } = useTranslation('audit')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorMessage = useErrorMessage()
  const labels = useAuditLabels()
  const filters = parseAuditFilters(params)
  const search = auditFiltersSearch(filters)
  const [expanded, setExpanded] = useState<string | undefined>()
  const problem = auditFilterProblem(filters)
  const log = useAuditLog(filters, problem === null)
  const items = log.data?.pages.flatMap((p) => p.items) ?? []
  const actorNotFound = log.data?.pages[0]?.actorNotFound === true

  const apply = (next: AuditFilters) => navigate(`/audit-log${auditFiltersSearch(next)}`)

  const columns: Column<AuditEntry>[] = [
    {
      id: 'createdAt',
      header: t('table.createdAt'),
      cell: (e) => <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time>,
      className: 'whitespace-nowrap text-muted-foreground',
    },
    { id: 'actor', header: t('table.actor'), cell: (e) => (e.actor ? `@${e.actor.username}` : t('system')), className: 'max-w-40 truncate' },
    { id: 'role', header: t('table.role'), cell: (e) => labels.role(e.actorRole), className: 'whitespace-nowrap' },
    { id: 'action', header: t('table.action'), cell: (e) => <span className="font-medium text-foreground">{labels.action(e.action)}</span> },
    {
      id: 'resource',
      header: t('table.resource'),
      cell: (e) => {
        const path = resourcePath(e)
        const text = `${labels.resourceType(e.resourceType)}${e.resourceId ? ` · ${e.resourceId.slice(0, 8)}` : ''}`
        return path ? (
          <Link to={path} onClick={(ev) => ev.stopPropagation()} className="text-primary hover:underline">
            {text}
          </Link>
        ) : (
          text
        )
      },
      className: 'whitespace-nowrap',
    },
    { id: 'reason', header: t('table.reason'), cell: (e) => e.reason ?? <span className="text-subtle-foreground">—</span>, className: 'max-w-64 truncate' },
    { id: 'source', header: t('table.source'), cell: (e) => e.sourceService, className: 'whitespace-nowrap text-muted-foreground' },
  ]

  const problemText = problemMessage(t, problem)
  const empty = actorNotFound ? t('filter.actorNotFound') : t('table.empty')

  return (
    <AdminPage title={t('title')} subtitle={t('subtitle')}>
      <AuditFilterForm key={search} filters={filters} problem={problem} onApply={apply} />

      <DataTable
        testId="audit-table"
        caption={t('table.caption')}
        columns={columns}
        rows={problem ? [] : items}
        rowKey={(e) => e.id}
        rowLabel={(e) => t('table.rowLabel', { action: labels.action(e.action), actor: e.actor ? `@${e.actor.username}` : t('system') })}
        onSelect={(e) => setExpanded((cur) => (cur === e.id ? undefined : e.id))}
        selectedKey={expanded}
        renderExpanded={(e) => <ExpandedEntry entry={e} />}
        loading={problem === null && log.isPending}
        error={log.error ? errorMessage(log.error) || t('table.loadError') : null}
        onRetry={() => void log.refetch()}
        empty={problem ? problemText ?? '' : empty}
        hasMore={log.hasNextPage}
        loadingMore={log.isFetchingNextPage}
        onLoadMore={() => void log.fetchNextPage()}
        endLabel={t('table.end')}
        minWidth="min-w-[960px]"
      />
    </AdminPage>
  )
}
