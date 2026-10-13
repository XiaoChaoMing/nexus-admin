import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, InfoIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api-error'
import { formatCalendarDate, formatDateTime } from '@/lib/format'
import { useSessionStore } from '@/features/session/session-store'
import { RejectDialog } from '@/features/applications/components/reject-dialog'
import { StatusBadge } from '@/features/applications/components/status-badge'
import { VerifiedBadge } from '@/features/applications/components/verified-badge'
import { useApplication } from '@/features/applications/hooks/use-applications'
import { useDecisions } from '@/features/applications/hooks/use-decisions'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-body-md break-words text-foreground">{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-label-sm tracking-wide text-subtle-foreground uppercase">{title}</h3>
      <dl>{children}</dl>
    </section>
  )
}

type ApplicationDetailProps = {
  id: string
  onClose: () => void
}

/** Detail of one application (GET /v1/admin/creator-applications/{id}) with Duyệt / Từ chối. */
export function ApplicationDetail({ id, onClose }: ApplicationDetailProps) {
  const { t } = useTranslation(['applications', 'common'])
  const { data: app, isPending, error, refetch } = useApplication(id)
  const myId = useSessionStore((s) => s.me?.user.id)
  const decisions = useDecisions(app)

  let body: ReactNode
  if (isPending) {
    body = (
      <div className="flex flex-col gap-3" aria-busy>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    )
  } else if (error || !app) {
    const notFound = isApiError(error) && error.status === 404
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-muted-foreground">{notFound ? t('detail.notFound') : t('detail.loadError')}</p>
        {!notFound && (
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            {t('common:actions.retry')}
          </Button>
        )}
      </div>
    )
  } else {
    const own = app.user.id === myId
    const pending = app.status === 'PENDING'

    body = (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <StatusBadge status={app.status} />
          <span className="text-body-sm text-muted-foreground">
            {t('detail.submittedAt')}: <time dateTime={app.createdAt}>{formatDateTime(app.createdAt)}</time>
          </span>
        </div>

        <Section title={t('detail.account')}>
          <Field label={t('detail.username')}>@{app.user.username}</Field>
          <Field label={t('detail.displayName')}>{app.user.displayName}</Field>
          <Field label={t('detail.email')}>
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-all">{app.user.email}</span>
              <VerifiedBadge verified={app.user.emailVerified} />
            </span>
          </Field>
          <Field label={t('detail.accountCreatedAt')}>{formatDateTime(app.user.createdAt)}</Field>
        </Section>

        <Separator />

        <Section title={t('detail.application')}>
          <Field label={t('detail.legalName')}>{app.legalName}</Field>
          <Field label={t('detail.birthDate')}>
            {t('detail.birthDateWithAge', { date: formatCalendarDate(app.birthDate), age: t('age', { count: app.age }) })}
          </Field>
          <Field label={t('detail.note')}>
            {app.note ? <span className="whitespace-pre-wrap">{app.note}</span> : <span className="text-subtle-foreground">{t('detail.noNote')}</span>}
          </Field>
          <Field label={t('detail.status')}>
            <StatusBadge status={app.status} />
          </Field>
          {app.reviewedAt && <Field label={t('detail.reviewedAt')}>{formatDateTime(app.reviewedAt)}</Field>}
          {app.rejectReason && (
            <Field label={t('detail.rejectReason')}>
              <span className="whitespace-pre-wrap">{app.rejectReason}</span>
            </Field>
          )}
        </Section>

        {pending && own && (
          <p className="flex gap-2 rounded-control border border-warning/50 bg-warning/10 px-3 py-2 text-body-sm text-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {t('detail.ownApplication')}
          </p>
        )}
        {!pending && <p className="text-body-sm text-subtle-foreground">{t('detail.decided')}</p>}

        {pending && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => decisions.open('approve')}>
              <CheckIcon aria-hidden />
              {t('approve.action')}
            </Button>
            <Button className="flex-1" variant="live" onClick={() => decisions.open('reject')}>
              <XIcon aria-hidden />
              {t('reject.action')}
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={decisions.dialog === 'approve'}
          title={t('approve.title', { username: app.user.username })}
          confirmLabel={t('approve.confirm')}
          loading={decisions.approving}
          onConfirm={decisions.confirmApprove}
          onClose={decisions.close}
        >
          {t('approve.body', { username: app.user.username })}
        </ConfirmDialog>
        <RejectDialog
          open={decisions.dialog === 'reject'}
          username={app.user.username}
          loading={decisions.rejecting}
          error={decisions.rejectError}
          onConfirm={decisions.confirmReject}
          onClose={decisions.close}
        />
      </div>
    )
  }

  return (
    <aside
      aria-label={t('detail.label')}
      data-testid="application-detail"
      className="flex flex-col rounded-panel border border-border bg-surface max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(440px,100%)] max-xl:overflow-y-auto max-xl:rounded-none max-xl:border-y-0 max-xl:border-r-0"
    >
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <h2 className="truncate text-headline-sm text-foreground">{app ? `@${app.user.username}` : t('detail.label')}</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('detail.close')}>
          <XIcon />
        </Button>
      </header>
      <div className="p-5">{body}</div>
    </aside>
  )
}
