import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AdminActionDialog } from '@/features/admin-actions/components/admin-action-dialog'
import { ChoiceGroup } from '@/features/admin-actions/components/choice-group'
import { LOCK_DURATIONS, TIMEOUT_DURATIONS, type LockDuration } from '@/features/admin-actions/types'
import { availableActions, otherOpenReports, type ResolutionAction, type ResolutionChoice } from '@/features/reports/lib/resolution'
import type { AdminReportDetail } from '@/features/reports/types'

type ResolveDialogProps = {
  mode: 'resolve' | 'dismiss' | null
  report: AdminReportDetail
  loading: boolean
  error: string | null
  onResolve: (choice: ResolutionChoice, reason: string, applyToSameTarget: boolean) => void
  onDismiss: (reason: string, applyToSameTarget: boolean) => void
  onClose: () => void
}

function choiceOf(action: ResolutionAction, lockHours: LockDuration, timeoutSec: number): ResolutionChoice {
  switch (action) {
    case 'LOCK_USER':
      return { action, durationHours: lockHours }
    case 'TIMEOUT':
      return { action, durationSec: timeoutSec }
    default:
      return { action }
  }
}

/** "Xử lý báo cáo" (action → reason → close the others too) and "Bỏ qua báo cáo?" (brief A2). */
export function ResolveDialog(props: ResolveDialogProps) {
  // Mounted only while open (keyed by the mode), so every opening starts from "no further action".
  return props.mode ? <ResolveDialogOpen key={props.mode} {...props} mode={props.mode} /> : null
}

function ResolveDialogOpen({ mode, report, loading, error, onResolve, onDismiss, onClose }: ResolveDialogProps & { mode: 'resolve' | 'dismiss' }) {
  const { t } = useTranslation(['reports', 'common'])
  const checkboxId = useId()
  const actions = availableActions(report)
  const others = otherOpenReports(report)
  const [action, setAction] = useState<ResolutionAction>('NONE')
  const [lockHours, setLockHours] = useState<LockDuration>(24)
  const [timeoutSec, setTimeoutSec] = useState<number>(600)
  const [applyToSameTarget, setApplyToSameTarget] = useState(true)

  const sameTarget =
    others > 0 ? (
      <div className="flex items-center gap-2">
        <Checkbox id={checkboxId} checked={applyToSameTarget} onCheckedChange={(v) => setApplyToSameTarget(v === true)} />
        <Label htmlFor={checkboxId} className="font-normal">
          {t('resolve.applyToSameTarget', { count: others })}
        </Label>
      </div>
    ) : null

  if (mode === 'dismiss') {
    return (
      <AdminActionDialog
        open
        title={t('dismiss.title')}
        description={t('dismiss.body')}
        confirmLabel={t('dismiss.confirm')}
        danger={false}
        reasonLabel={t('resolve.noteLabel')}
        loading={loading}
        error={error}
        footer={sameTarget}
        onConfirm={(reason) => onDismiss(reason, others > 0 && applyToSameTarget)}
        onClose={onClose}
      />
    )
  }

  return (
    <AdminActionDialog
      open
      wide
      title={t('resolve.title')}
      description={t('resolve.body', { target: report.target.label })}
      confirmLabel={t('resolve.confirm')}
      danger={action !== 'NONE'}
      reasonLabel={t('resolve.noteLabel')}
      loading={loading}
      error={error}
      footer={sameTarget}
      onConfirm={(reason) => onResolve(choiceOf(action, lockHours, timeoutSec), reason, others > 0 && applyToSameTarget)}
      onClose={onClose}
    >
      <ChoiceGroup
        legend={t('resolve.actionLegend')}
        value={action}
        onChange={setAction}
        choices={actions.map((a) => ({ value: a, label: t(`resolve.choice.${a}`), hint: t(`resolve.choiceHint.${a}`) }))}
      />
      {action === 'LOCK_USER' && (
        <ChoiceGroup
          inline
          legend={t('common:duration.lockLegend')}
          value={lockHours}
          onChange={setLockHours}
          choices={LOCK_DURATIONS.map((h) => ({ value: h, label: t(`common:duration.lock.${h ?? 'forever'}`) }))}
        />
      )}
      {action === 'TIMEOUT' && (
        <ChoiceGroup
          inline
          legend={t('common:duration.timeoutLegend')}
          value={timeoutSec}
          onChange={setTimeoutSec}
          choices={TIMEOUT_DURATIONS.map((s) => ({ value: s, label: t(`common:duration.timeout.${s}`) }))}
        />
      )}
    </AdminActionDialog>
  )
}
