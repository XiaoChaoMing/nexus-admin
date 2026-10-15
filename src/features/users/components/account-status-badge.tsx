import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { accountState } from '@/features/users/lib/account-status'
import type { UserStatus } from '@/features/users/types'

/** Badge/Account Status: Hoạt động (green) · Đã khóa tới … / Khóa vĩnh viễn (red) · Đã xóa (neutral). */
export function AccountStatusBadge({ status, lockedUntil }: { status: UserStatus; lockedUntil: string | null }) {
  const { t } = useTranslation('users')
  const state = accountState(status, lockedUntil)

  switch (state.kind) {
    case 'ACTIVE':
      return (
        <Badge variant="outline" className="border-success/50 text-success" data-status="ACTIVE">
          {t('status.ACTIVE')}
        </Badge>
      )
    case 'DELETED':
      return (
        <Badge variant="secondary" data-status="DELETED">
          {t('status.DELETED')}
        </Badge>
      )
    case 'LOCKED':
      return (
        <Badge variant="outline" className="border-destructive/60 text-destructive" data-status="LOCKED">
          {state.until ? t('status.lockedUntil', { time: formatDateTime(state.until) }) : t('status.lockedForever')}
        </Badge>
      )
  }
}
