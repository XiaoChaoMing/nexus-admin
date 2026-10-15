import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { InfoIcon, LockIcon, LockOpenIcon, TvIcon } from 'lucide-react'
import { DetailError, DetailPanel, DetailSkeleton, Field, Section } from '@/components/admin/detail-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { useSessionStore } from '@/features/session/session-store'
import { useApplying } from '@/features/admin-actions/hooks/use-applying'
import { ResourceHistory } from '@/features/audit/components/resource-history'
import { AccountStatusBadge } from '@/features/users/components/account-status-badge'
import { LockDialog, UnlockDialog } from '@/features/users/components/lock-dialogs'
import { useAdminUser } from '@/features/users/hooks/use-users'
import { useUserActions } from '@/features/users/hooks/use-user-actions'
import { accountRole, lockAvailability } from '@/features/users/lib/account-status'

function Note({ children }: { children: string }) {
  return (
    <p className="flex gap-2 rounded-control border border-warning/50 bg-warning/10 px-3 py-2 text-body-sm text-foreground">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      {children}
    </p>
  )
}

/** Người dùng — chi tiết (brief A3): identity's account view, history, lock / unlock. */
export function UserDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation(['users', 'common'])
  const myId = useSessionStore((s) => s.me?.user.id)
  const { data: user, isPending, error, refetch } = useAdminUser(id)
  const { applying, start } = useApplying(user ? `${user.status}|${user.lockedUntil}` : undefined)
  const actions = useUserActions(user, start)

  let body
  if (isPending) body = <DetailSkeleton />
  else if (error || !user) {
    const notFound = isApiError(error) && error.status === 404
    body = <DetailError message={notFound ? t('detail.notFound') : t('detail.loadError')} onRetry={notFound ? undefined : () => void refetch()} />
  } else {
    const availability = lockAvailability(user, myId)
    body = (
      <>
        <div className="flex flex-col gap-1">
          <span className="text-headline-md text-foreground">{user.displayName}</span>
          <span className="text-body-md text-muted-foreground">@{user.username}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2" aria-live="polite">
            <AccountStatusBadge status={user.status} lockedUntil={user.lockedUntil} />
            {applying && <Badge variant="secondary">{t('common:applying')}</Badge>}
          </span>
        </div>

        <Section title={t('detail.account')}>
          <dl>
            <Field label={t('detail.email')}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="break-all">{user.email}</span>
                <Badge variant={user.emailVerified ? 'outline' : 'secondary'} className={user.emailVerified ? 'border-success/50 text-success' : undefined}>
                  {user.emailVerified ? t('detail.verified') : t('detail.unverified')}
                </Badge>
              </span>
            </Field>
            <Field label={t('detail.role')}>{t(`role.${accountRole(user)}`)}</Field>
            <Field label={t('detail.createdAt')}>{formatDateTime(user.createdAt)}</Field>
            {user.status === 'LOCKED' && (
              <>
                <Field label={t('detail.lockedUntil')}>{user.lockedUntil ? formatDateTime(user.lockedUntil) : t('status.lockedForever')}</Field>
                {user.lockKind && <Field label={t('detail.lockKind')}>{t(`lockKind.${user.lockKind}`)}</Field>}
                {user.lockReason && (
                  <Field label={t('detail.lockReason')}>
                    <span className="whitespace-pre-wrap">{user.lockReason}</span>
                  </Field>
                )}
              </>
            )}
            {user.channelId && (
              <Field label={t('detail.channel')}>
                <Link to={`/channels/${encodeURIComponent(user.channelId)}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <TvIcon className="size-3.5" aria-hidden />
                  {t('detail.openChannel')}
                </Link>
              </Field>
            )}
          </dl>
        </Section>

        <Section title={t('detail.history')}>
          <ResourceHistory resourceId={user.id} />
        </Section>

        {availability === 'admin' && <Note>{t('detail.cannotLockAdmin')}</Note>}
        {availability === 'self' && <Note>{t('detail.cannotLockSelf')}</Note>}
        {availability === 'lock' && (
          <Button variant="destructive" onClick={() => actions.open('lock')}>
            <LockIcon aria-hidden />
            {t('lock.action')}
          </Button>
        )}
        {availability === 'unlock' && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => actions.open('unlock')}>
              <LockOpenIcon aria-hidden />
              {t('unlock.action')}
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => actions.open('lock')}>
              {t('lock.change')}
            </Button>
          </div>
        )}

        <LockDialog
          open={actions.dialog === 'lock'}
          username={user.username}
          loading={actions.locking}
          error={actions.dialogError}
          onConfirm={actions.lock}
          onClose={actions.close}
        />
        <UnlockDialog
          open={actions.dialog === 'unlock'}
          username={user.username}
          loading={actions.unlocking}
          error={actions.dialogError}
          onConfirm={actions.unlock}
          onClose={actions.close}
        />
      </>
    )
  }

  return (
    <DetailPanel label={t('detail.label')} heading={user ? `@${user.username}` : t('detail.label')} testId="user-detail" onClose={onClose}>
      {body}
    </DetailPanel>
  )
}
