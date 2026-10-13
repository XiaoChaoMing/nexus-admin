import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { STATUS_BADGE } from '@/features/applications/lib/status'
import type { ApplicationStatus } from '@/features/applications/types'

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation('applications')

  return <Badge variant={STATUS_BADGE[status]}>{t(`status.${status}`)}</Badge>
}
