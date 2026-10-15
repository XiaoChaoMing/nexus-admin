import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DataTable, type Column } from '@/components/admin/data-table'
import { FilterBar, FilterSelect } from '@/components/admin/filter-bar'
import { AdminPage, MasterDetail } from '@/components/admin/page-layout'
import { SearchForm } from '@/components/admin/search-form'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { AccountStatusBadge } from '@/features/users/components/account-status-badge'
import { UserDetailPanel } from '@/features/users/components/user-detail'
import { useUserSearch } from '@/features/users/hooks/use-users'
import { USER_STATUSES, type AdminUserRow, type UserStatus } from '@/features/users/types'

function parseStatus(raw: string | null): UserStatus | 'ALL' {
  return USER_STATUSES.includes(raw as UserStatus) ? (raw as UserStatus) : 'ALL'
}

/** /users[/:id]?q=&status= — lookup on safety's copy, detail from identity (brief A3). */
export function UsersPage() {
  const { t } = useTranslation('users')
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorMessage = useErrorMessage()
  const q = params.get('q')?.trim() ?? ''
  const status = parseStatus(params.get('status'))
  const list = useUserSearch(q, status)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  const go = (nextId: string | undefined, next: { q: string; status: UserStatus | 'ALL' } = { q, status }) => {
    const search = new URLSearchParams()
    if (next.q) search.set('q', next.q)
    if (next.status !== 'ALL') search.set('status', next.status)
    const s = search.toString()
    navigate(`/users${nextId ? `/${encodeURIComponent(nextId)}` : ''}${s ? `?${s}` : ''}`)
  }
  const close = () => go(undefined)

  const columns: Column<AdminUserRow>[] = [
    {
      id: 'user',
      header: t('table.user'),
      cell: (u) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{u.displayName}</span>
          <span className="truncate text-body-sm text-muted-foreground">@{u.username}</span>
        </span>
      ),
      className: 'max-w-64',
    },
    { id: 'role', header: t('table.role'), cell: (u) => t(`globalRole.${u.globalRole}`), className: 'whitespace-nowrap' },
    { id: 'status', header: t('table.status'), cell: (u) => <AccountStatusBadge status={u.status} lockedUntil={u.lockedUntil} /> },
    { id: 'reports', header: t('table.openReports'), cell: (u) => u.openReports, numeric: true },
  ]

  return (
    <AdminPage title={t('title')} subtitle={t('subtitle')}>
      <FilterBar label={t('filter.label')}>
        <SearchForm key={q} label={t('search.label')} placeholder={t('search.placeholder')} submitLabel={t('search.submit')} value={q} onSearch={(next) => go(undefined, { q: next, status })} />
        <FilterSelect
          label={t('filter.status')}
          value={status}
          options={[{ value: 'ALL' as const, label: t('filter.all') }, ...USER_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))]}
          onChange={(next) => go(undefined, { q, status: next })}
        />
      </FilterBar>

      <MasterDetail
        placeholder={t('detail.placeholder')}
        onClose={close}
        table={
          <DataTable
            testId="users-table"
            caption={t('table.caption')}
            columns={columns}
            rows={items}
            rowKey={(u) => u.id}
            rowLabel={(u) => t('table.rowLabel', { username: u.username })}
            selectedKey={id}
            onSelect={(u) => go(u.id)}
            loading={list.isPending}
            error={list.error ? errorMessage(list.error) || t('table.loadError') : null}
            onRetry={() => void list.refetch()}
            empty={q ? t('table.notFound') : t('table.empty')}
            hasMore={list.hasNextPage}
            loadingMore={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
            endLabel={t('table.end')}
            minWidth="min-w-[560px]"
          />
        }
        detail={id ? <UserDetailPanel key={id} id={id} onClose={close} /> : null}
      />
    </AdminPage>
  )
}
