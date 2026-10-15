import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DataTable, type Column } from '@/components/admin/data-table'
import { FilterBar, FilterSelect } from '@/components/admin/filter-bar'
import { AdminPage, MasterDetail } from '@/components/admin/page-layout'
import { SearchForm } from '@/components/admin/search-form'
import { Badge } from '@/components/ui/badge'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { ChannelDetailPanel } from '@/features/channels/components/channel-detail'
import { ChannelAvatar, ChannelStatusBadge } from '@/features/channels/components/channel-status-badge'
import { useChannelSearch } from '@/features/channels/hooks/use-channels'
import { CHANNEL_STATUSES, type AdminChannel, type ChannelStatus } from '@/features/channels/types'

function parseStatus(raw: string | null): ChannelStatus | 'ALL' {
  return CHANNEL_STATUSES.includes(raw as ChannelStatus) ? (raw as ChannelStatus) : 'ALL'
}

/** /channels[/:id]?q=&status= — lookup and suspend / restore (brief A4). */
export function ChannelsPage() {
  const { t } = useTranslation('channels')
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorMessage = useErrorMessage()
  const q = params.get('q')?.trim() ?? ''
  const status = parseStatus(params.get('status'))
  const list = useChannelSearch(q, status)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  const go = (nextId: string | undefined, next: { q: string; status: ChannelStatus | 'ALL' } = { q, status }) => {
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
    if (next.status !== 'ALL') search.set('status', next.status)
    const s = search.toString()
    navigate(`/channels${nextId ? `/${encodeURIComponent(nextId)}` : ''}${s ? `?${s}` : ''}`)
  }
  const close = () => go(undefined)

  const columns: Column<AdminChannel>[] = [
    {
      id: 'channel',
      header: t('table.channel'),
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <ChannelAvatar name={c.displayName} url={c.avatarUrl} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">{c.displayName}</span>
            <span className="truncate text-body-sm text-muted-foreground">@{c.handle}</span>
          </span>
        </span>
      ),
      className: 'max-w-72',
    },
    { id: 'owner', header: t('table.owner'), cell: (c) => `@${c.owner.username}`, className: 'max-w-40 truncate' },
    {
      id: 'status',
      header: t('table.status'),
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <ChannelStatusBadge status={c.status} />
          {c.currentStreamId && <Badge variant="live">{t('detail.live')}</Badge>}
        </span>
      ),
    },
    { id: 'reports', header: t('table.openReports'), cell: (c) => c.openReports, numeric: true },
  ]

  return (
    <AdminPage title={t('title')} subtitle={t('subtitle')}>
      <FilterBar label={t('filter.label')}>
        <SearchForm key={q} label={t('search.label')} placeholder={t('search.placeholder')} submitLabel={t('search.submit')} value={q} onSearch={(next) => go(undefined, { q: next, status })} />
        <FilterSelect
          label={t('filter.status')}
          value={status}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...CHANNEL_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))]}
          onChange={(next) => go(undefined, { q, status: next })}
        />
      </FilterBar>

      <MasterDetail
        placeholder={t('detail.placeholder')}
        onClose={close}
        table={
          <DataTable
            testId="channels-table"
            caption={t('table.caption')}
            columns={columns}
            rows={items}
            rowKey={(c) => c.id}
            rowLabel={(c) => t('table.rowLabel', { name: c.displayName, handle: c.handle })}
            selectedKey={id}
            onSelect={(c) => go(c.id)}
            loading={list.isPending}
            error={list.error ? errorMessage(list.error) || t('table.loadError') : null}
            onRetry={() => void list.refetch()}
            empty={q ? t('table.notFound') : t('table.empty')}
            hasMore={list.hasNextPage}
            loadingMore={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
            endLabel={t('table.end')}
            minWidth="min-w-[600px]"
          />
        }
        detail={id ? <ChannelDetailPanel key={id} id={id} onClose={close} /> : null}
      />
    </AdminPage>
  )
}
