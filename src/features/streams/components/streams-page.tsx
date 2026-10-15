import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ExternalLinkIcon } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table'
import { AdminPage } from '@/components/admin/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCount, formatElapsed } from '@/lib/format'
import { webAppUrl } from '@/lib/ids'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { adminActionsApi } from '@/features/admin-actions/api/admin-actions-api'
import { AdminActionDialog } from '@/features/admin-actions/components/admin-action-dialog'
import { useActionError } from '@/features/admin-actions/hooks/use-action-error'
import { useSettle } from '@/features/admin-actions/hooks/use-settle'
import { streamKeys, useCategoryNames, useLiveStreams, useNow } from '@/features/streams/hooks/use-streams'
import type { LiveStream } from '@/features/streams/types'

/** /streams — Buổi phát đang live (brief A5): poll 30 s, take down with a reason. */
export function StreamsPage() {
  const { t } = useTranslation('streams')
  const errorMessage = useErrorMessage()
  const describe = useActionError()
  const settle = useSettle()
  const list = useLiveStreams()
  const categories = useCategoryNames()
  const now = useNow()
  const [target, setTarget] = useState<LiveStream | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // Taken down but still in the last poll: shown as "Đang gỡ…" until stream-svc ends it.
  const [takenDown, setTakenDown] = useState<ReadonlySet<string>>(new Set())
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  const affected = () => settle([streamKeys.all, ['admin', 'channels'], ['admin', 'audit']])

  const takedown = useMutation({
    mutationFn: (vars: { stream: LiveStream; reason: string }) => adminActionsApi.takedownStream(vars.stream.id, { reason: vars.reason }),
    onSuccess: (_, { stream }) => {
      setTarget(null)
      setTakenDown((prev) => new Set(prev).add(stream.id))
      affected()
      toast.success(t('takedown.success'))
    },
    onError: (err) => {
      const { text, field, stale } = describe(err, 'takedownStream')
      if (field) return setDialogError(text)
      setTarget(null)
      if (stale) affected()
      toast.error(text)
    },
  })

  const columns: Column<LiveStream>[] = [
    {
      id: 'stream',
      header: t('table.stream'),
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-3">
          <img src={s.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-control bg-card object-cover" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="line-clamp-2 font-medium text-foreground">{s.title}</span>
            <span className="flex flex-wrap gap-1">
              {s.status === 'INTERRUPTED' ? <Badge variant="warning">{t('status.INTERRUPTED')}</Badge> : <Badge variant="live">{t('status.LIVE')}</Badge>}
              {s.isMature && <Badge variant="outline">18+</Badge>}
            </span>
          </span>
        </span>
      ),
      className: 'max-w-96',
    },
    {
      id: 'channel',
      header: t('table.channel'),
      cell: (s) =>
        s.channel ? (
          <Link to={`/channels/${encodeURIComponent(s.channel.id)}`} className="text-primary hover:underline">
            {s.channel.displayName}
          </Link>
        ) : (
          <Link to={`/channels/${encodeURIComponent(s.channelId)}`} className="text-primary hover:underline">
            {s.channelId.slice(0, 8)}
          </Link>
        ),
      className: 'max-w-48 truncate',
    },
    {
      id: 'category',
      header: t('table.category'),
      cell: (s) => (s.category && categories.get(s.category.id)) || <span className="text-subtle-foreground">—</span>,
      className: 'max-w-40 truncate',
    },
    {
      id: 'viewers',
      header: t('table.viewers'),
      cell: (s) => (s.viewerCount == null ? '—' : formatCount(s.viewerCount)),
      numeric: true,
    },
    {
      id: 'elapsed',
      header: t('table.elapsed'),
      cell: (s) => (s.startedAt ? formatElapsed((now - Date.parse(s.startedAt)) / 1000) : '—'),
      numeric: true,
    },
    {
      id: 'actions',
      header: t('table.actions'),
      srOnlyHeader: true,
      cell: (s) => (
        <span className="flex items-center justify-end gap-3">
          <a
            href={webAppUrl(`/live/${s.id}`)}
            target="_blank"
            rel="noreferrer"
            aria-label={t('table.watchLabel', { title: s.title })}
            className="inline-flex items-center gap-1 text-body-sm whitespace-nowrap text-primary hover:underline"
          >
            {t('table.watch')}
            <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
          {takenDown.has(s.id) ? (
            <Badge variant="secondary">{t('takedown.pending')}</Badge>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              aria-label={t('takedown.actionLabel', { title: s.title })}
              onClick={() => {
                setDialogError(null)
                setTarget(s)
              }}
            >
              {t('takedown.action')}
            </Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <AdminPage title={t('title')} subtitle={t('subtitle')}>
      <DataTable
        testId="streams-table"
        caption={t('table.caption')}
        columns={columns}
        rows={items}
        rowKey={(s) => s.id}
        loading={list.isPending}
        error={list.error ? errorMessage(list.error) || t('table.loadError') : null}
        onRetry={() => void list.refetch()}
        empty={t('table.empty')}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
        minWidth="min-w-[900px]"
      />

      <AdminActionDialog
        open={target !== null}
        title={t('takedown.title', { title: target?.title ?? '' })}
        description={t('takedown.body')}
        confirmLabel={t('takedown.confirm')}
        loading={takedown.isPending}
        error={dialogError}
        onConfirm={(reason) => target && takedown.mutate({ stream: target, reason })}
        onClose={() => setTarget(null)}
      />
    </AdminPage>
  )
}
