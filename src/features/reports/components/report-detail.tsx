import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CheckIcon, ExternalLinkIcon, HandIcon, UserSearchIcon } from 'lucide-react'
import { DetailError, DetailPanel, DetailSkeleton, Field, Section } from '@/components/admin/detail-panel'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { webAppUrl } from '@/lib/ids'
import { useSessionStore } from '@/features/session/session-store'
import { EvidenceList } from '@/features/reports/components/evidence-list'
import { ReportStatusBadge, ReportTarget } from '@/features/reports/components/report-badges'
import { ResolveDialog } from '@/features/reports/components/resolve-dialog'
import { useReport } from '@/features/reports/hooks/use-reports'
import { useReportActions } from '@/features/reports/hooks/use-report-actions'
import { lockDurationOf } from '@/features/reports/lib/labels'
import { isOpen, targetUserId } from '@/features/reports/lib/resolution'
import type { AdminAction, AdminReportDetail } from '@/features/reports/types'

function ActionLine({ action }: { action: AdminAction }) {
  const { t } = useTranslation(['reports', 'common'])
  const duration = action.type === 'LOCK_USER' ? lockDurationOf(action) : undefined
  const label =
    action.type === 'CHAT_TIMEOUT' && action.expiresAt
      ? t('history.timeoutUntil', { time: formatDateTime(action.expiresAt) })
      : duration === undefined
        ? t(`history.type.${action.type}`)
        : duration === 'OTHER'
          ? t('history.lockUntil', { time: formatDateTime(action.expiresAt) })
          : t('history.lockFor', { duration: t(`common:duration.lock.${duration ?? 'forever'}`) })

  return (
    <li className="text-body-md">
      <span className="text-foreground">{label}</span>
      <span className="text-subtle-foreground">
        {' · '}
        {t('history.by', { username: action.admin.username })} · <time dateTime={action.createdAt}>{formatDateTime(action.createdAt)}</time>
      </span>
      <p className="text-body-sm break-words text-muted-foreground">{action.reason}</p>
    </li>
  )
}

/** Link to the target: the user web app for streams / channels / messages, the Người dùng page for people. */
function TargetLinks({ report }: { report: AdminReportDetail }) {
  const { t } = useTranslation('reports')
  const userId = targetUserId(report)

  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {report.target.link && (
        <a href={webAppUrl(report.target.link)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          {report.targetType === 'CHANNEL' ? t('target.openProfile') : t('target.openWatch')}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      )}
      {userId && (
        <Link to={`/users/${encodeURIComponent(userId)}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          <UserSearchIcon className="size-3.5" aria-hidden />
          {report.targetType === 'CHANNEL' || report.targetType === 'STREAM' ? t('target.viewOwner') : t('target.viewUser')}
        </Link>
      )}
    </span>
  )
}

function ClaimState({ report, onClaim, claiming }: { report: AdminReportDetail; onClaim: () => void; claiming: boolean }) {
  const { t } = useTranslation('reports')
  const myId = useSessionStore((s) => s.me?.user.id)

  if (!isOpen(report)) {
    return (
      <div className="flex flex-col gap-1 rounded-control border border-border bg-card px-3 py-2.5 text-body-md" data-testid="report-closed">
        <span className="text-foreground">
          {t(report.status === 'DISMISSED' ? 'claim.dismissedBy' : 'claim.resolvedBy', {
            username: report.resolvedBy?.username ?? '—',
            time: formatDateTime(report.resolvedAt),
          })}
        </span>
        {report.resolutionNote && <span className="break-words whitespace-pre-wrap text-muted-foreground">{report.resolutionNote}</span>}
      </div>
    )
  }

  if (report.status === 'OPEN' || !report.assignedTo) {
    return (
      <Button variant="secondary" onClick={onClaim} loading={claiming}>
        {!claiming && <HandIcon aria-hidden />}
        {t('claim.action')}
      </Button>
    )
  }

  if (report.assignedTo.id === myId) {
    return (
      <p className="flex items-center gap-2 text-body-md text-cyan">
        <CheckIcon className="size-4" aria-hidden />
        {t('claim.mine')}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-body-md text-muted-foreground">{t('claim.byOther', { username: report.assignedTo.username })}</span>
      <Button variant="secondary" size="sm" onClick={onClaim} loading={claiming}>
        {t('claim.reclaim')}
      </Button>
    </div>
  )
}

type ReportDetailProps = { id: string; onClose: () => void; onOpen: (id: string) => void }

/** Chi tiết báo cáo (brief A2): report, target, evidence, history on the target, other reports, claim / resolve / dismiss. */
export function ReportDetailPanel({ id, onClose, onOpen }: ReportDetailProps) {
  const { t } = useTranslation(['reports', 'common'])
  const { data: report, isPending, error, refetch } = useReport(id)
  const actions = useReportActions(report)

  let body
  if (isPending) body = <DetailSkeleton />
  else if (error || !report) {
    const notFound = isApiError(error) && error.status === 404
    body = <DetailError message={notFound ? t('detail.notFound') : t('detail.loadError')} onRetry={notFound ? undefined : () => void refetch()} />
  } else {
    const open = isOpen(report)
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge status={report.status} />
          <span className="text-body-sm text-muted-foreground">
            {t('detail.reportedAt', { time: formatDateTime(report.createdAt) })}
          </span>
        </div>

        <Section title={t('detail.report')}>
          <dl>
            <Field label={t('detail.reason')}>{t(`reason.${report.reason}`)}</Field>
            <Field label={t('detail.note')}>
              {report.note ? <span className="whitespace-pre-wrap">{report.note}</span> : <span className="text-subtle-foreground">{t('detail.noNote')}</span>}
            </Field>
            <Field label={t('detail.reporter')}>@{report.reporter.username}</Field>
          </dl>
        </Section>

        <Section title={t('detail.target')}>
          <dl>
            <Field label={t('detail.targetType')}>{t(`targetType.${report.targetType}`)}</Field>
            <Field label={t('detail.targetLabel')}>
              <ReportTarget report={report} className="items-start [&>span:last-child]:whitespace-normal [&>svg]:mt-0.5" />
            </Field>
          </dl>
          <TargetLinks report={report} />
        </Section>

        <Section title={t('detail.evidence')} testId="report-evidence">
          <EvidenceList report={report} />
        </Section>

        <Section title={t('detail.history')}>
          {report.actions.length ? (
            <ul className="flex flex-col gap-2">
              {report.actions.map((a) => (
                <ActionLine key={a.id} action={a} />
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-subtle-foreground">{t('history.empty')}</p>
          )}
        </Section>

        {report.relatedReports.length > 0 && (
          <Section title={t('detail.related', { count: report.relatedReports.length })}>
            <ul className="flex flex-col">
              {report.relatedReports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-body-md hover:bg-accent"
                  >
                    <ReportStatusBadge status={r.status} />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {t(`reason.${r.reason}`)} · @{r.reporter.username}
                    </span>
                    <time dateTime={r.createdAt} className="shrink-0 text-body-sm text-subtle-foreground">
                      {formatDateTime(r.createdAt)}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <ClaimState report={report} onClaim={actions.claim} claiming={actions.claiming} />

        {open && (
          <div className="flex gap-2">
            <Button className="flex-1" variant="secondary" onClick={() => actions.open('dismiss')}>
              {t('dismiss.action')}
            </Button>
            <Button className="flex-1" onClick={() => actions.open('resolve')}>
              {t('resolve.action')}
            </Button>
          </div>
        )}

        <ResolveDialog
          mode={actions.dialog}
          report={report}
          loading={actions.resolving || actions.dismissing}
          error={actions.dialogError}
          onResolve={actions.confirmResolve}
          onDismiss={actions.confirmDismiss}
          onClose={actions.close}
        />
      </>
    )
  }

  return (
    <DetailPanel label={t('detail.label')} heading={report ? t(`targetType.${report.targetType}`) + ' · ' + t(`reason.${report.reason}`) : t('detail.label')} testId="report-detail" onClose={onClose}>
      {body}
    </DetailPanel>
  )
}
