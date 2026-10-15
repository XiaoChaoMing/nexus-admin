import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminActionDialog } from '@/features/admin-actions/components/admin-action-dialog'
import { ChoiceGroup } from '@/features/admin-actions/components/choice-group'
import { LOCK_DURATIONS, type LockDuration } from '@/features/admin-actions/types'

type LockDialogProps = {
  open: boolean
  username: string
  loading: boolean
  error: string | null
  onConfirm: (durationHours: LockDuration, reason: string) => void
  onClose: () => void
}

/** "Khóa tài khoản @x?" with 24 giờ · 7 ngày · 30 ngày · Vĩnh viễn (brief A3). Also "Đổi thời hạn khóa". */
export function LockDialog(props: LockDialogProps) {
  // Mounted only while open, so every opening starts from 24 h.
  return props.open ? <LockDialogOpen {...props} /> : null
}

function LockDialogOpen({ open, username, loading, error, onConfirm, onClose }: LockDialogProps) {
  const { t } = useTranslation(['users', 'common'])
  const [hours, setHours] = useState<LockDuration>(24)

  return (
    <AdminActionDialog
      open={open}
      title={t('lock.title', { username })}
      description={t('lock.body')}
      confirmLabel={t('lock.confirm')}
      loading={loading}
      error={error}
      onConfirm={(reason) => onConfirm(hours, reason)}
      onClose={onClose}
    >
      <ChoiceGroup
        inline
        legend={t('common:duration.lockLegend')}
        value={hours}
        onChange={setHours}
        choices={LOCK_DURATIONS.map((h) => ({ value: h, label: t(`common:duration.lock.${h ?? 'forever'}`) }))}
      />
    </AdminActionDialog>
  )
}

type UnlockDialogProps = Omit<LockDialogProps, 'onConfirm'> & { onConfirm: (reason: string) => void }

export function UnlockDialog({ open, username, loading, error, onConfirm, onClose }: UnlockDialogProps) {
  const { t } = useTranslation('users')

  return (
    <AdminActionDialog
      open={open}
      danger={false}
      title={t('unlock.title', { username })}
      description={t('unlock.body')}
      confirmLabel={t('unlock.confirm')}
      loading={loading}
      error={error}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
