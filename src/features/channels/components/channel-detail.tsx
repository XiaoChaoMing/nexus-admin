import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ExternalLinkIcon, PauseCircleIcon, PlayCircleIcon } from 'lucide-react'
import { DetailError, DetailPanel, DetailSkeleton, Field, Section } from '@/components/admin/detail-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { webAppUrl } from '@/lib/ids'
import { AdminActionDialog } from '@/features/admin-actions/components/admin-action-dialog'
import { useApplying } from '@/features/admin-actions/hooks/use-applying'
import { ResourceHistory } from '@/features/audit/components/resource-history'
import { ChannelAvatar, ChannelStatusBadge } from '@/features/channels/components/channel-status-badge'
import { useChannelActions } from '@/features/channels/hooks/use-channel-actions'
import { useAdminChannel } from '@/features/channels/hooks/use-channels'

/** Kênh — chi tiết (brief A4): status, owner, live state, history; suspend / restore. */
export function ChannelDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation(['channels', 'common'])
  const { data: channel, isPending, error, refetch } = useAdminChannel(id)
  const { applying, start } = useApplying(channel?.status)
  const actions = useChannelActions(channel, start)

  let body
  if (isPending) body = <DetailSkeleton />
  else if (error || !channel) {
    const notFound = isApiError(error) && error.status === 404
    body = <DetailError message={notFound ? t('detail.notFound') : t('detail.loadError')} onRetry={notFound ? undefined : () => void refetch()} />
  } else {
    const suspended = channel.status === 'SUSPENDED'
    body = (
      <>
        <div className="flex items-center gap-3">
          <ChannelAvatar name={channel.displayName} url={channel.avatarUrl} size="size-14" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-headline-md text-foreground">{channel.displayName}</span>
            <span className="truncate text-body-md text-muted-foreground">@{channel.handle}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2" aria-live="polite">
              <ChannelStatusBadge status={channel.status} />
              {channel.currentStreamId && <Badge variant="live">{t('detail.live')}</Badge>}
              {applying && <Badge variant="secondary">{t('common:applying')}</Badge>}
            </span>
          </div>
        </div>

        <Section title={t('detail.channel')}>
          <dl>
            <Field label={t('detail.owner')}>
              <Link to={`/users/${encodeURIComponent(channel.owner.id)}`} className="text-primary hover:underline">
                @{channel.owner.username}
              </Link>
            </Field>
            <Field label={t('detail.openReports')}>{channel.openReports}</Field>
            {channel.suspendedAt && <Field label={t('detail.suspendedAt')}>{formatDateTime(channel.suspendedAt)}</Field>}
            {channel.currentStreamId && (
              <Field label={t('detail.currentStream')}>
                <a
                  href={webAppUrl(`/live/${channel.currentStreamId}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t('detail.watch')}
                  <ExternalLinkIcon className="size-3.5" aria-hidden />
                </a>
              </Field>
            )}
          </dl>
          {!suspended && (
            <a href={webAppUrl(`/${channel.handle}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body-md text-primary hover:underline">
              {t('detail.openProfile')}
              <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          )}
        </Section>

        <Section title={t('detail.history')}>
          <ResourceHistory resourceId={channel.id} />
        </Section>

        {suspended ? (
          <Button onClick={() => actions.open('restore')}>
            <PlayCircleIcon aria-hidden />
            {t('restore.action')}
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => actions.open('suspend')}>
            <PauseCircleIcon aria-hidden />
            {t('suspend.action')}
          </Button>
        )}

        <AdminActionDialog
          open={actions.dialog === 'suspend'}
          title={t('suspend.title', { name: channel.displayName })}
          description={t('suspend.body')}
          confirmLabel={t('suspend.confirm')}
          loading={actions.suspending}
          error={actions.dialogError}
          onConfirm={actions.suspend}
          onClose={actions.close}
        />
        <AdminActionDialog
          open={actions.dialog === 'restore'}
          danger={false}
          title={t('restore.title', { name: channel.displayName })}
          description={t('restore.body')}
          confirmLabel={t('restore.confirm')}
          loading={actions.restoring}
          error={actions.dialogError}
          onConfirm={actions.restore}
          onClose={actions.close}
        />
      </>
    )
  }

  return (
    <DetailPanel label={t('detail.label')} heading={channel ? channel.displayName : t('detail.label')} testId="channel-detail" onClose={onClose}>
      {body}
    </DetailPanel>
  )
}
