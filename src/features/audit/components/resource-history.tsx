import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { useAuditLabels } from '@/features/audit/hooks/use-audit-labels'
import { useResourceHistory } from '@/features/audit/hooks/use-audit'

/** "Lịch sử" of a user or a channel: the 10 newest audit rows about it, with a link to the full log. */
export function ResourceHistory({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation('audit')
  const labels = useAuditLabels()
  const { data, isPending, error } = useResourceHistory(resourceId)

  if (isPending) return <Skeleton className="h-10 w-full" />
  if (error) return <p className="text-body-sm text-destructive">{t('table.loadError')}</p>

  return (
    <div className="flex flex-col gap-2">
      {data.items.length === 0 ? (
        <p className="text-body-sm text-subtle-foreground">{t('history.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="resource-history">
          {data.items.map((e) => (
            <li key={e.id} className="text-body-md">
              <span className="text-foreground">{labels.action(e.action)}</span>
              <span className="text-subtle-foreground">
                {' · '}
                {e.actor ? `@${e.actor.username}` : t('system')} · <time dateTime={e.createdAt}>{formatDateTime(e.createdAt)}</time>
              </span>
              {e.reason && <p className="text-body-sm break-words text-muted-foreground">{e.reason}</p>}
            </li>
          ))}
        </ul>
      )}
      <Link to={`/audit-log?resourceId=${encodeURIComponent(resourceId)}`} className="text-body-sm text-primary hover:underline">
        {t('history.viewAll')}
      </Link>
    </div>
  )
}
