import { useTranslation } from 'react-i18next'
import { TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatClock, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { authorFromLabel } from '@/features/reports/lib/labels'
import { targetUserId } from '@/features/reports/lib/resolution'
import type { AdminReportDetail } from '@/features/reports/types'

type EvidenceListProps = {
  report: Pick<AdminReportDetail, 'targetType' | 'target' | 'evidence' | 'evidenceStatus'>
}

/**
 * Admin/Evidence Message (brief A0/A2): up to 10 messages, oldest first, with the reported one highlighted and the
 * original text of deleted messages (only admins ever see it).
 */
export function EvidenceList({ report }: EvidenceListProps) {
  const { t } = useTranslation('reports')

  if (report.targetType === 'STREAM' || report.targetType === 'CHANNEL') {
    return <p className="text-body-sm text-subtle-foreground">{t('evidence.notForTarget')}</p>
  }

  if (report.evidenceStatus === 'UNAVAILABLE') {
    return (
      <div role="note" className="flex gap-2 rounded-control bg-warning/15 px-3 py-2.5 text-body-md text-foreground">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>
          <span className="font-semibold">{t('evidence.unavailableTitle')}</span>
          <span className="block text-body-sm text-muted-foreground">{t('evidence.unavailableBody')}</span>
        </span>
      </div>
    )
  }

  if (report.evidence.length === 0) return <p className="text-body-sm text-subtle-foreground">{t('evidence.none')}</p>

  const author = authorFromLabel(report)
  const authorId = targetUserId(report)

  return (
    <ol className="flex flex-col gap-1" data-testid="evidence-list" aria-label={t('evidence.listLabel', { count: report.evidence.length })}>
      {report.evidence.map((m) => {
        const reported = report.targetType === 'MESSAGE' && m.messageId === report.target.id
        const name = m.username ? `@${m.username}` : m.userId === authorId && author ? author : `#${m.userId.slice(0, 8)}`

        return (
          <li
            key={m.messageId}
            data-reported={reported || undefined}
            className={cn(
              'rounded-control border-l-2 px-2.5 py-1.5 text-body-md',
              reported ? 'border-l-warning bg-warning/10' : 'border-l-transparent',
            )}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)} className="text-label-sm text-subtle-foreground tabular-nums">
                {formatClock(m.createdAt)}
              </time>
              <span className="font-semibold text-foreground">{name}</span>
              {reported && (
                <Badge variant="outline" className="border-warning/60 text-warning">
                  {t('evidence.reported')}
                </Badge>
              )}
              {m.deleted && <Badge variant="secondary">{t('evidence.deleted')}</Badge>}
            </div>
            <p className="mt-0.5 break-words whitespace-pre-wrap text-foreground">{m.body}</p>
          </li>
        )
      })}
    </ol>
  )
}
